function doGet(e) {
  var action = (e.parameter.action || '').toLowerCase();
  var result = {
    ok: false,
    data: null,
    error: ''
  };

  try {
    if (action === 'produtos') {
      result.data = getProdutos();
      result.ok = true;
      return buildResponse(result);
    } else if (action === 'pedidos') {
      result.data = getPedidos();
      result.ok = true;
      return buildResponse(result);
    } else if (action === 'click') {
      var produtoId = e.parameter.produtoId || '';
      var clickResult = registrarClick(produtoId);
      return buildResponse({ ok: true, clicks: clickResult.clicks });
    } else if (action === 'metricas') {
      var periodo = e.parameter.periodo || 'hoje';
      result.data = getMetricas_(periodo);
      result.ok = true;
      return buildResponse(result);
    } else {
      return buildResponse({ ok: false, error: 'Ação inválida. Use action=produtos, action=click ou action=pedido.' });
    }
  } catch (err) {
    return buildResponse({ ok: false, error: err.toString() });
  }
}

// Executar essa função manualmente no Google Apps Script para forçar a tela de permissões de GRAVAÇÃO do Drive
function autorizarDrive() {
  var folder = DriveApp.createFolder('Vendly Autorizacao Temporaria');
  folder.setTrashed(true); // exclui imediatamente
  Logger.log('Permissões de gravação do Google Drive concedidas com sucesso!');
}

function doPost(e) {
  var action = (e.parameter.action || '').toLowerCase();
  
  if (action === 'atualizarstatus') {
    try {
      var payload = {};
      if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
      if (!payload.item_id || !payload.status) throw new Error('ID ou Status não fornecidos.');
      
      var res = atualizarStatusPedido(payload.item_id, payload.status, payload.final_price);
      return buildResponse({ ok: true, rowsUpdated: res });
    } catch (err) {
      return buildResponse({ ok: false, error: err.toString() });
    }
  }

  if (action === 'salvar_estoque') {
    try {
      var payload = {};
      if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
      if (!payload.estoque_updates || !Array.isArray(payload.estoque_updates)) throw new Error('Atualizações de estoque inválidas.');
      
      var res = salvarEstoqueManualmente(payload.estoque_updates);
      return buildResponse({ ok: true, rowsUpdated: res });
    } catch (err) {
      return buildResponse({ ok: false, error: err.toString() });
    }
  }

  if (action === 'salvar_produto') {
    try {
      var payload = {};
      if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
      if (!payload.produtos || !Array.isArray(payload.produtos) || payload.produtos.length === 0) throw new Error('Nenhum produto fornecido.');
      var res = salvarNovoProduto(payload.produtos);
      return buildResponse({ ok: true, count: res });
    } catch (err) {
      return buildResponse({ ok: false, error: err.toString() });
    }
  }
  
  if (action === 'editar_produto') {
    try {
      var payload = {};
      if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
      if (!payload.sku) throw new Error('SKU não fornecido.');
      var res = editarProduto_(payload);
      return buildResponse({ ok: true, updated: res });
    } catch (err) {
      return buildResponse({ ok: false, error: err.toString() });
    }
  }

  if (action === 'toggle_ativo') {
    try {
      var payload = {};
      if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
      if (!payload.sku) throw new Error('SKU não fornecido.');
      var res = toggleAtivoProduto_(payload.sku);
      return buildResponse({ ok: true, ativo: res });
    } catch (err) {
      return buildResponse({ ok: false, error: err.toString() });
    }
  }

  if (action === 'remover_produto') {
    try {
      var payload = {};
      if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
      if (!payload.sku) throw new Error('SKU não fornecido.');
      removerProduto_(payload.sku);
      return buildResponse({ ok: true });
    } catch (err) {
      return buildResponse({ ok: false, error: err.toString() });
    }
  }

  if (action === 'upload_imagem') {
    try {
      var payload = {};
      if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
      if (!payload.base64 || !payload.filename) throw new Error('Dados de imagem não fornecidos.');
      var url = uploadImagemDrive_(payload.base64, payload.filename);
      return buildResponse({ ok: true, url: url });
    } catch (err) {
      return buildResponse({ ok: false, error: err.toString() });
    }
  }

  if (action === 'excluir_pedido') {
    try {
      var payload = {};
      if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
      if (!payload.item_id) throw new Error('ID do Item não fornecido.');
      excluirPedido(payload.item_id);
      return buildResponse({ ok: true });
    } catch (err) {
      return buildResponse({ ok: false, error: err.toString() });
    }
  }

  if (action === 'salvar_pedido') {
    try {
      var payload = {};
      if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
      var res = salvarPedido(payload);
      return buildResponse({ ok: true, pedido_id: res.pedido_id });
    } catch (err) {
      return buildResponse({ ok: false, error: err.toString() });
    }
  }

  if (action === 'registrar_evento') {
    try {
      var payload = {};
      if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
      if (!payload.tipo) throw new Error('Campo tipo é obrigatório.');
      registrarEvento_(payload);
      return buildResponse({ ok: true });
    } catch (err) {
      return buildResponse({ ok: false, error: err.toString() });
    }
  }
  
  if (action !== 'pedido') {
    return buildResponse({ ok: false, error: 'Ação inválida.' });
  }

  try {
    var payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      return buildResponse({ ok: false, error: 'Corpo do pedido não encontrado.' });
    }

    var pedido = salvarPedido(payload);
    return buildResponse({ ok: true, pedido_id: pedido.pedido_id });
  } catch (err) {
    return buildResponse({ ok: false, error: err.toString() });
  }
}

function getProdutos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Produtos');
  if (!sheet) throw new Error('Aba Produtos não encontrada.');

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  // Ensure expected columns exist (adds headers if missing)
  ensureProdutosColumns_(sheet, rows[0]);

  // Reload after potential header changes
  rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(String);
  var dataRows = rows.slice(1);

  var itens = dataRows.map(function(r) {
    var obj = {};
    headers.forEach(function(h, idx) {
      obj[h.trim().toLowerCase()] = r[idx];
    });

    var cameraFrontal = String(obj['camera_frontal'] || obj['câmera_frontal'] || obj['camera frontal'] || obj['câmera frontal'] || '');
    var cameraTraseira = String(obj['camera_traseira'] || obj['câmera_traseira'] || obj['camera traseira'] || obj['câmera traseira'] || '');
    return {
      id: String(obj['id'] || ''),
      sku: String(obj['sku'] || obj['id'] || ''),
      estoque: obj['estoque'] !== undefined && obj['estoque'] !== '' ? Number(obj['estoque']) : 0,
      estoque_minimo: obj['estoque_minimo'] !== undefined && obj['estoque_minimo'] !== '' ? Number(obj['estoque_minimo']) : 2,
      grupo_id: String(obj['grupo_id'] || obj['id'] || ''),
      cor: String(obj['cor'] || ''),
      nome: String(obj['nome'] || ''),
      descricao: String(obj['descrição'] || obj['descricao'] || ''),
      categoria: String(obj['categoria'] || ''),
      preco: Number(obj['preço'] || obj['preco'] || 0),
      imagem: String(obj['imagem_1'] || obj['imagem'] || ''),
      images: [
        String(obj['imagem_1'] || obj['imagem'] || ''),
        String(obj['imagem_2'] || ''),
        String(obj['imagem_3'] || ''),
        String(obj['imagem_4'] || ''),
        String(obj['imagem_5'] || '')
      ].filter(img => img && img.trim() !== ''),
      armazenamento: String(obj['armazenamento'] || ''),
      ram: String(obj['ram'] || ''),
      // Cameras (new split fields + legacy compatibility)
      camera_frontal: cameraFrontal,
      camera_traseira: cameraTraseira,
      bateria: String(obj['bateria'] || ''),
      tela: String(obj['tela'] || ''),
      condicao: String(obj['condição'] || obj['condicao'] || ''),
      ativo: obj['ativo'] === undefined || obj['ativo'] === '' || String(obj['ativo']).toLowerCase() === 'true' || obj['ativo'] === true,
      custo: Number(obj['custo'] || obj['preco_custo'] || 0),
      clicks: Number(obj['clicks'] || 0),
      imei1: String(obj['imei1'] || ''),
      imei2: String(obj['imei2'] || ''),
      codigo_serie: String(obj['codigo_serie'] || ''),
      origem: String(obj['origem'] || ''),
      saude_bateria: String(obj['saude_bateria'] || '')
    };
  });
  return itens;
}

function ensureProdutosColumns_(sheet, headerRow) {
  var headers = (headerRow || []).map(function(h) { return String(h || '').trim().toLowerCase(); });
  var required = [
    { key: 'imagem_1', label: 'imagem_1' },
    { key: 'imagem_2', label: 'imagem_2' },
    { key: 'imagem_3', label: 'imagem_3' },
    { key: 'imagem_4', label: 'imagem_4' },
    { key: 'imagem_5', label: 'imagem_5' },
    { key: 'camera_frontal', label: 'camera_frontal' },
    { key: 'camera_traseira', label: 'camera_traseira' },
    { key: 'custo', label: 'custo' },
    { key: 'imei1', label: 'imei1' },
    { key: 'imei2', label: 'imei2' },
    { key: 'codigo_serie', label: 'codigo_serie' },
    { key: 'origem', label: 'origem' },
    { key: 'saude_bateria', label: 'saude_bateria' },
    { key: 'ram', label: 'ram' },
    { key: 'bateria', label: 'bateria' },
    { key: 'tela', label: 'tela' }
  ];

  var added = false;
  required.forEach(function(r) {
    if (headers.indexOf(r.key) === -1) {
      var newCol = headers.length + 1;
      sheet.getRange(1, newCol).setValue(r.label);
      headers.push(r.key);
      added = true;
    }
  });
  return added;
}

function getPedidos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Pedidos');
  if (!sheet) return [];

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  var headers = rows[0].map(function(h) { return String(h).trim(); });
  var dataRows = rows.slice(1);

  return dataRows.map(function(r) {
    var obj = {};
    headers.forEach(function(h, idx) {
      // Cria uma chave limpa (ex: "ID do Pedido" vira "id_do_pedido", "Condição" mantem carateres)
      var key = h.toLowerCase().replace(/ /g, '_');
      obj[key] = r[idx];
    });
    return obj;
  });
}

function registrarClick(produtoId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Produtos');
  if (!sheet) throw new Error('Aba Produtos não encontrada.');

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });

  var idCol = headers.indexOf('id');
  var clicksCol = headers.indexOf('clicks');

  // Se a coluna 'clicks' não existir, criar
  if (clicksCol === -1) {
    clicksCol = headers.length;
    sheet.getRange(1, clicksCol + 1).setValue('clicks');
    // Inicializar todas as linhas com 0
    for (var i = 1; i < rows.length; i++) {
      sheet.getRange(i + 1, clicksCol + 1).setValue(0);
    }
  }

  // Encontrar a linha do produto e incrementar
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(produtoId)) {
      var currentClicks = Number(sheet.getRange(i + 1, clicksCol + 1).getValue()) || 0;
      var newClicks = currentClicks + 1;
      sheet.getRange(i + 1, clicksCol + 1).setValue(newClicks);
      return { clicks: newClicks };
    }
  }

  throw new Error('Produto não encontrado: ' + produtoId);
}

function salvarPedido(pedido) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Pedidos');
  if (!sheet) {
    sheet = ss.insertSheet('Pedidos');
    sheet.appendRow(['Data', 'ID do Pedido', 'Group ID', 'Marca', 'Produto', 'Armazenamento', 'Cor', 'Condição', 'IMEI 1', 'Saude Bateria', 'Quantidade', 'Total', 'Status', 'SKU', 'Estoque Processado']);
  }

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });

  // Ensure SKU and Estoque Processado columns exist
  var skuCol = headers.indexOf('sku');
  if (skuCol === -1) {
    skuCol = headers.length;
    sheet.getRange(1, skuCol + 1).setValue('SKU');
    headers.push('sku');
  }
  var epCol = headers.indexOf('estoque processado');
  if (epCol === -1) {
    epCol = headers.length;
    sheet.getRange(1, epCol + 1).setValue('Estoque Processado');
    headers.push('estoque processado');
  }
  var itemIdCol = headers.indexOf('id do item');
  if (itemIdCol === -1) {
    itemIdCol = headers.length;
    sheet.getRange(1, itemIdCol + 1).setValue('ID do Item');
    headers.push('id do item');
  }
  var imeiCol = headers.indexOf('imei 1');
  if (imeiCol === -1) {
    imeiCol = headers.length;
    sheet.getRange(1, imeiCol + 1).setValue('IMEI 1');
    headers.push('imei 1');
  }
  var batCol = headers.indexOf('saude bateria');
  if (batCol === -1) {
    batCol = headers.length;
    sheet.getRange(1, batCol + 1).setValue('Saude Bateria');
    headers.push('saude bateria');
  }

  var pedidoId = 'PED-' + new Date().getTime();
  var dataHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (pedido.itens && pedido.itens.length > 0) {
    pedido.itens.forEach(function(item) {
      var totalItem = Number(item.preco || 0) * Number(item.quantidade || 0);
      var rowData = new Array(headers.length);
      for(var i=0; i<headers.length; i++) rowData[i] = '';
      
      var mapHeader = function(hName, val) {
        var idx = headers.indexOf(hName.toLowerCase());
        if (idx !== -1) rowData[idx] = val;
      };

      mapHeader('data', dataHora);
      mapHeader('id do pedido', pedidoId);
      
      // UNIQUE ITEM ID
      var itemId = 'ITM-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
      mapHeader('id do item', itemId);

      mapHeader('group id', item.group_id || '');
      mapHeader('marca', item.marca || '');
      mapHeader('produto', item.nome || '');
      mapHeader('armazenamento', item.armazenamento || '');
      mapHeader('cor', item.cor || '');
      mapHeader('condição', item.condicao || '');
      mapHeader('imei 1', item.imei1 || '');
      mapHeader('saude bateria', item.saude_bateria || '');
      mapHeader('quantidade', item.quantidade || 1);
      mapHeader('total', totalItem);
      mapHeader('status', 'Pendente');
      mapHeader('sku', item.sku || '');
      mapHeader('estoque processado', '');

      sheet.appendRow(rowData);
    });
  } else {
      var rowData = new Array(headers.length);
      for(var i=0; i<headers.length; i++) rowData[i] = '';
      var idxId = headers.indexOf('id do pedido'); if(idxId !== -1) rowData[idxId] = pedidoId;
      var idxData = headers.indexOf('data'); if(idxData !== -1) rowData[idxData] = dataHora;
      
      var itemIdEmpty = 'ITM-' + new Date().getTime() + '-MT';
      var idxItem = headers.indexOf('id do item'); if(idxItem !== -1) rowData[idxItem] = itemIdEmpty;
      
      var idxProd = headers.indexOf('produto'); if(idxProd !== -1) rowData[idxProd] = 'Pedido Vazio';
      var idxTotal = headers.indexOf('total'); if(idxTotal !== -1) rowData[idxTotal] = Number(pedido.total || 0);
      var idxStatus = headers.indexOf('status'); if(idxStatus !== -1) rowData[idxStatus] = 'Pendente';
      sheet.appendRow(rowData);
  }

  return { pedido_id: pedidoId };
}

function atualizarStatusPedido(itemId, novoStatus, precoFinal) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Pedidos');
  var prodSheet = ss.getSheetByName('Produtos');
  if (!sheet) throw new Error('Aba Pedidos não encontrada.');

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return 0;
  
  var headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var idColIdx = headers.indexOf('id do pedido');
  var statusColIdx = headers.indexOf('status');
  var skuColIdx = headers.indexOf('sku');
  var estProcColIdx = headers.indexOf('estoque processado');
  var qtdColIdx = headers.indexOf('quantidade');
  
  if (idColIdx === -1) throw new Error('Coluna "ID do Pedido" não encontrada.');
  
  // Se não existir ID do Item
  var itemIdColIdx = headers.indexOf('id do item');
  if (itemIdColIdx === -1) {
    itemIdColIdx = headers.length;
    sheet.getRange(1, itemIdColIdx + 1).setValue('ID do Item');
    headers.push('id do item');
  }
  
  // Se coluna status não existir, crie
  if (statusColIdx === -1) {
    statusColIdx = headers.length;
    sheet.getRange(1, statusColIdx + 1).setValue('Status');
    headers.push('status');
  }
  // Se não existir preço_final
  var finalPriceColIdx = headers.indexOf('preço final');
  if (finalPriceColIdx === -1) {
    finalPriceColIdx = headers.length;
    sheet.getRange(1, finalPriceColIdx + 1).setValue('Preço Final');
    headers.push('preço final');
  }
  // Se não existir estoque_processado
  if (estProcColIdx === -1) {
    estProcColIdx = headers.length;
    sheet.getRange(1, estProcColIdx + 1).setValue('Estoque Processado');
    headers.push('estoque processado');
  }

  var updatedCount = 0;
  
  // Lógica de Estoque: Precisamos pegar ranges e values de Produtos
  var prodRows = [], prodHeaders = [], pSkuColIdx = -1, pEstoqueColIdx = -1, pIdColIdx = -1;
  if (prodSheet) {
    prodRows = prodSheet.getDataRange().getValues();
    if (prodRows.length > 0) {
      prodHeaders = prodRows[0].map(function(h) { return String(h).trim().toLowerCase(); });
      pSkuColIdx = prodHeaders.indexOf('sku');
      pEstoqueColIdx = prodHeaders.indexOf('estoque');
      pIdColIdx = prodHeaders.indexOf('id');
    }
  }

  var safeUpdateEstoque = function(sku, deltaQtd) {
    if (!prodSheet || pEstoqueColIdx === -1) return;
    for (var j = 1; j < prodRows.length; j++) {
      var rowSku = pSkuColIdx !== -1 ? String(prodRows[j][pSkuColIdx]) : '';
      var rowId = pIdColIdx !== -1 ? String(prodRows[j][pIdColIdx]) : '';
      if ((rowSku !== '' && rowSku === String(sku)) || (rowSku === '' && rowId === String(sku)) || (rowId === String(sku))) {
        var currentStock = Number(prodRows[j][pEstoqueColIdx]) || 0;
        var newStock = currentStock + deltaQtd;
        prodSheet.getRange(j + 1, pEstoqueColIdx + 1).setValue(newStock);
        prodRows[j][pEstoqueColIdx] = newStock; // update local cache
        break;
      }
    }
  };

  for (var i = 1; i < rows.length; i++) {
    // BUSCA POR ITEM ID (UNICO)
    if (String(rows[i][itemIdColIdx]) === String(itemId)) {
      var estProc = estProcColIdx !== -1 ? rows[i][estProcColIdx] : '';
      var sku = skuColIdx !== -1 ? rows[i][skuColIdx] : '';
      var qtd = qtdColIdx !== -1 ? Number(rows[i][qtdColIdx] || 1) : 1;
      
      sheet.getRange(i + 1, statusColIdx + 1).setValue(novoStatus);
      rows[i][statusColIdx] = novoStatus;

      // Atualiza o precoFinal apenas para este item
      if (precoFinal !== undefined && precoFinal !== null) {
        sheet.getRange(i + 1, finalPriceColIdx + 1).setValue(precoFinal);
        rows[i][finalPriceColIdx] = precoFinal;
      }
      
      // Regra de Estoque (Sempre por item)
      if (novoStatus === 'Fechado' && estProc !== 'SIM' && sku) {
        safeUpdateEstoque(sku, -qtd);
        if (estProcColIdx !== -1) {
          sheet.getRange(i + 1, estProcColIdx + 1).setValue('SIM');
          rows[i][estProcColIdx] = 'SIM';
        }
      } else if (novoStatus === 'Cancelado' && estProc === 'SIM' && sku) {
        safeUpdateEstoque(sku, qtd);
        if (estProcColIdx !== -1) {
          sheet.getRange(i + 1, estProcColIdx + 1).setValue('NÃO');
          rows[i][estProcColIdx] = 'NÃO';
        }
      }
      
      updatedCount++;
      break; // Saímos do loop pois o item é único
    }
  }
  return updatedCount;
}

function excluirPedido(itemId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Pedidos');
  var prodSheet = ss.getSheetByName('Produtos');
  if (!sheet) throw new Error('Aba Pedidos não encontrada.');

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) throw new Error('Nenhum pedido encontrado.');

  var headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var itemIdCol = headers.indexOf('id do item');
  var statusCol = headers.indexOf('status');
  var estProcCol = headers.indexOf('estoque processado');
  var skuCol = headers.indexOf('sku');
  var qtdCol = headers.indexOf('quantidade');

  if (itemIdCol === -1) throw new Error('Coluna "ID do Item" não encontrada.');

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][itemIdCol]) === String(itemId)) {
      var status = statusCol !== -1 ? rows[i][statusCol] : '';
      var estProc = estProcCol !== -1 ? rows[i][estProcCol] : '';
      var sku = skuCol !== -1 ? rows[i][skuCol] : '';
      var qtd = qtdCol !== -1 ? Number(rows[i][qtdCol] || 1) : 1;

      // Se o estoque foi processado, devolve ao estoque
      if (estProc === 'SIM' && sku && prodSheet) {
        var prodRows = prodSheet.getDataRange().getValues();
        var prodHeaders = prodRows[0].map(function(h) { return String(h).trim().toLowerCase(); });
        var pSkuCol = prodHeaders.indexOf('sku');
        var pIdCol = prodHeaders.indexOf('id');
        var pEstoqueCol = prodHeaders.indexOf('estoque');

        if (pEstoqueCol !== -1) {
          for (var j = 1; j < prodRows.length; j++) {
            var rowSku = pSkuCol !== -1 ? String(prodRows[j][pSkuCol]) : '';
            var rowId = pIdCol !== -1 ? String(prodRows[j][pIdCol]) : '';
            if ((rowSku !== '' && rowSku === String(sku)) || (rowSku === '' && rowId === String(sku)) || (rowId === String(sku))) {
              var currentStock = Number(prodRows[j][pEstoqueCol]) || 0;
              prodSheet.getRange(j + 1, pEstoqueCol + 1).setValue(currentStock + qtd);
              break;
            }
          }
        }
      }

      // Exclui a linha do pedido
      sheet.deleteRow(i + 1);
      return true;
    }
  }

  throw new Error('Pedido não encontrado.');
}

function salvarEstoqueManualmente(updates) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Produtos');
  if (!sheet) throw new Error('Aba Produtos não encontrada.');

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return 0;

  var headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var skuCol = headers.indexOf('sku');
  var idCol = headers.indexOf('id');
  var estoqueCol = headers.indexOf('estoque');
  var minCol = headers.indexOf('estoque_minimo');

  if (skuCol === -1 && idCol === -1) throw new Error('Colunas SKU e ID não encontradas.');
  
  if (estoqueCol === -1) {
    estoqueCol = headers.length;
    sheet.getRange(1, estoqueCol + 1).setValue('Estoque');
    headers.push('estoque');
  }
  if (minCol === -1) {
    minCol = headers.length;
    sheet.getRange(1, minCol + 1).setValue('Estoque Mínimo');
    headers.push('estoque_minimo');
  }

  var updatedCount = 0;
  var updateMap = {};
  updates.forEach(function(u) {
    if (u.sku) updateMap[String(u.sku)] = u;
  });

  for (var i = 1; i < rows.length; i++) {
    var rowSku = skuCol !== -1 ? String(rows[i][skuCol]) : '';
    var rowId = idCol !== -1 ? String(rows[i][idCol]) : '';
    var searchKey = rowSku !== '' ? rowSku : rowId;
    
    if (updateMap[searchKey] || updateMap[rowId]) {
      var u = updateMap[searchKey] || updateMap[rowId];
      if (u.estoque !== undefined) sheet.getRange(i + 1, estoqueCol + 1).setValue(u.estoque);
      if (u.estoque_minimo !== undefined) sheet.getRange(i + 1, minCol + 1).setValue(u.estoque_minimo);
      updatedCount++;
    }
  }

  return updatedCount;
}



function salvarNovoProduto(produtos) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Produtos');
  if (!sheet) throw new Error('Aba Produtos não encontrada.');

  var rows = sheet.getDataRange().getValues();
  ensureProdutosColumns_(sheet, rows[0]);

  // Reload headers after ensuring columns
  rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h || '').trim().toLowerCase(); });

  // Ensure id, sku, grupo_id, ativo columns exist
  var requiredCols = [
    { key: 'id', label: 'id' },
    { key: 'sku', label: 'sku' },
    { key: 'grupo_id', label: 'grupo_id' },
    { key: 'ativo', label: 'ativo' },
    { key: 'estoque', label: 'estoque' },
    { key: 'estoque_minimo', label: 'estoque_minimo' },
    { key: 'imagem_1', label: 'imagem_1' },
    { key: 'imagem_2', label: 'imagem_2' },
    { key: 'imagem_3', label: 'imagem_3' },
    { key: 'imagem_4', label: 'imagem_4' },
    { key: 'imagem_5', label: 'imagem_5' }
  ];
  var addedCols = false;
  requiredCols.forEach(function(r) {
    if (headers.indexOf(r.key) === -1) {
      var newCol = headers.length + 1;
      sheet.getRange(1, newCol).setValue(r.label);
      headers.push(r.key);
      addedCols = true;
    }
  });
  if (addedCols) {
    rows = sheet.getDataRange().getValues();
    headers = rows[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  }

  var fieldMap = {
    'id': 'id', 'sku': 'sku', 'grupo_id': 'grupo_id', 'nome': 'nome',
    'descricao': 'descrição', 'categoria': 'categoria', 'preco': 'preço',
    'custo': 'custo', 'imagem': 'imagem', 'cor': 'cor',
    'armazenamento': 'armazenamento', 'ram': 'ram',
    'camera_frontal': 'camera_frontal', 'camera_traseira': 'camera_traseira',
    'bateria': 'bateria', 'tela': 'tela', 'condicao': 'condição',
    'ativo': 'ativo', 'estoque': 'estoque', 'estoque_minimo': 'estoque_minimo',
    'clicks': 'clicks', 'imei1': 'imei1', 'imei2': 'imei2',
    'codigo_serie': 'codigo_serie', 'origem': 'origem', 'saude_bateria': 'saude_bateria',
    'imagem_1': 'imagem_1', 'imagem_2': 'imagem_2', 'imagem_3': 'imagem_3',
    'imagem_4': 'imagem_4', 'imagem_5': 'imagem_5'
  };

  var count = 0;
  produtos.forEach(function(prod) {
    // Fallback: generate id/sku/grupo_id if not provided
    var fallbackId = 'PROD-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
    if (!prod.id) prod.id = fallbackId;
    if (!prod.sku) prod.sku = prod.id;
    if (!prod.grupo_id) prod.grupo_id = prod.id;

    // Default ativo to 'true' for new products
    if (prod.ativo === undefined || prod.ativo === '') prod.ativo = 'true';

    // Default estoque
    if (prod.estoque === undefined || prod.estoque === '') prod.estoque = 0;

    var rowData = new Array(headers.length);
    for (var i = 0; i < headers.length; i++) rowData[i] = '';

    for (var key in prod) {
      if (!prod.hasOwnProperty(key)) continue;
      var sheetHeader = fieldMap[key] || key;
      var colIdx = headers.indexOf(sheetHeader.toLowerCase());
      if (colIdx === -1) colIdx = headers.indexOf(key.toLowerCase());
      if (colIdx !== -1) rowData[colIdx] = prod[key];
    }

    sheet.appendRow(rowData);
    count++;
  });

  return count;
}




function editarProduto_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Produtos');
  if (!sheet) throw new Error('Aba Produtos não encontrada.');

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) throw new Error('Planilha vazia.');

  var headers = rows[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var skuCol = headers.indexOf('sku');
  var idCol = headers.indexOf('id');
  if (skuCol === -1 && idCol === -1) throw new Error('Colunas SKU/ID não encontradas.');

  var fieldMap = {
    'nome': 'nome', 'descricao': 'descrição', 'categoria': 'categoria',
    'preco': 'preço', 'custo': 'custo', 'imagem': 'imagem', 'cor': 'cor',
    'armazenamento': 'armazenamento', 'ram': 'ram',
    'camera_frontal': 'camera_frontal', 'camera_traseira': 'camera_traseira',
    'bateria': 'bateria', 'tela': 'tela', 'condicao': 'condição',
    'estoque': 'estoque', 'estoque_minimo': 'estoque_minimo',
    'imei1': 'imei1', 'imei2': 'imei2',
    'codigo_serie': 'codigo_serie', 'origem': 'origem', 'saude_bateria': 'saude_bateria',
    'imagem_1': 'imagem_1', 'imagem_2': 'imagem_2', 'imagem_3': 'imagem_3',
    'imagem_4': 'imagem_4', 'imagem_5': 'imagem_5'
  };

  var targetSku = String(payload.sku);
  var found = false;

  for (var i = 1; i < rows.length; i++) {
    var rowSku = skuCol !== -1 ? String(rows[i][skuCol]) : '';
    var rowId = idCol !== -1 ? String(rows[i][idCol]) : '';
    if (rowSku === targetSku || rowId === targetSku) {
      // Update each field that was sent
      for (var key in payload) {
        if (key === 'sku') continue;
        var sheetHeader = fieldMap[key] || key;
        var colIdx = headers.indexOf(sheetHeader.toLowerCase());
        if (colIdx === -1) colIdx = headers.indexOf(key.toLowerCase());
        if (colIdx !== -1) {
          sheet.getRange(i + 1, colIdx + 1).setValue(payload[key]);
        }
      }
      found = true;
      break;
    }
  }

  if (!found) throw new Error('Produto com SKU ' + targetSku + ' não encontrado.');
  return true;
}

function toggleAtivoProduto_(sku) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Produtos');
  if (!sheet) throw new Error('Aba Produtos não encontrada.');

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var skuCol = headers.indexOf('sku');
  var idCol = headers.indexOf('id');
  var ativoCol = headers.indexOf('ativo');
  if (ativoCol === -1) throw new Error('Coluna "ativo" não encontrada.');

  var targetSku = String(sku);
  for (var i = 1; i < rows.length; i++) {
    var rowSku = skuCol !== -1 ? String(rows[i][skuCol]) : '';
    var rowId = idCol !== -1 ? String(rows[i][idCol]) : '';
    if (rowSku === targetSku || rowId === targetSku) {
      var currentVal = String(rows[i][ativoCol] || '').toLowerCase();
      var isActive = currentVal === 'true' || currentVal === 'sim';
      var newVal = !isActive;
      sheet.getRange(i + 1, ativoCol + 1).setValue(newVal ? 'true' : 'false');
      return newVal;
    }
  }
  throw new Error('Produto com SKU ' + targetSku + ' não encontrado.');
}

function removerProduto_(sku) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Produtos');
  if (!sheet) throw new Error('Aba Produtos não encontrada.');

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var skuCol = headers.indexOf('sku');
  var idCol = headers.indexOf('id');

  var targetSku = String(sku);
  for (var i = 1; i < rows.length; i++) {
    var rowSku = skuCol !== -1 ? String(rows[i][skuCol]) : '';
    var rowId = idCol !== -1 ? String(rows[i][idCol]) : '';
    if (rowSku === targetSku || rowId === targetSku) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
  throw new Error('Produto com SKU ' + targetSku + ' não encontrado.');
}

function buildResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ---- Upload de Imagem para Google Drive ----
function uploadImagemDrive_(base64Data, filename) {
  // Remove header if present (e.g. "data:image/jpeg;base64,...")
  var cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  var decoded = Utilities.base64Decode(cleanBase64);
  var blob = Utilities.newBlob(decoded, 'image/jpeg', filename);

  // Get or create folder
  var folderName = 'Vendly Imagens';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Return direct image link
  var fileId = file.getId();
  return 'https://lh3.googleusercontent.com/d/' + fileId;
}

// ---- Métricas: Tracking de Eventos da Vitrine ----

var METRICAS_SHEET_NAME_ = 'Métricas';
var METRICAS_HEADERS_ = ['timestamp', 'tipo', 'session_id', 'produto', 'origem', 'metadata'];

function ensureMetricasSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(METRICAS_SHEET_NAME_);
  if (!sheet) {
    sheet = ss.insertSheet(METRICAS_SHEET_NAME_);
    sheet.appendRow(METRICAS_HEADERS_);
  }
  return sheet;
}

function registrarEvento_(payload) {
  var sheet = ensureMetricasSheet_();
  var ts = payload.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  sheet.appendRow([
    ts,
    String(payload.tipo || ''),
    String(payload.session_id || ''),
    String(payload.produto || ''),
    String(payload.origem || ''),
    String(payload.metadata || '')
  ]);
}

function getMetricas_(periodo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(METRICAS_SHEET_NAME_);
  if (!sheet) return [];

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  var headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var tsCol = headers.indexOf('timestamp');
  if (tsCol === -1) return [];

  // Calculate date cutoff based on period
  var now = new Date();
  var cutoff = new Date();

  switch (periodo) {
    case 'hoje':
      cutoff.setHours(0, 0, 0, 0);
      break;
    case 'ontem':
      cutoff.setDate(cutoff.getDate() - 1);
      cutoff.setHours(0, 0, 0, 0);
      // Also set upper bound to end of yesterday
      var upperBound = new Date();
      upperBound.setHours(0, 0, 0, 0);
      break;
    case '7d':
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      break;
    case '14d':
      cutoff.setDate(cutoff.getDate() - 14);
      cutoff.setHours(0, 0, 0, 0);
      break;
    case '30d':
      cutoff.setDate(cutoff.getDate() - 30);
      cutoff.setHours(0, 0, 0, 0);
      break;
    case 'max':
      cutoff = new Date(0); // epoch
      break;
    default:
      cutoff.setHours(0, 0, 0, 0); // default = hoje
  }

  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var rawTs = rows[i][tsCol];
    var rowDate;
    if (rawTs instanceof Date) {
      rowDate = rawTs;
    } else {
      rowDate = new Date(String(rawTs));
    }
    if (isNaN(rowDate.getTime())) continue;

    // Apply period filter
    if (rowDate < cutoff) continue;
    if (periodo === 'ontem' && upperBound && rowDate >= upperBound) continue;

    var obj = {};
    headers.forEach(function(h, idx) {
      obj[h] = rows[i][idx];
    });
    // Normalize timestamp to ISO string for frontend
    obj.timestamp = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
    result.push(obj);
  }

  return result;
}
