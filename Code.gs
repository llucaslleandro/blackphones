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
      return buildResponse(result.data);
    } else {
      return buildResponse({ ok: false, error: 'Ação inválida. Use action=produtos ou action=pedido.' });
    }
  } catch (err) {
    return buildResponse({ ok: false, error: err.toString() });
  }
}

function doPost(e) {
  var action = (e.parameter.action || '').toLowerCase();
  if (action !== 'pedido') {
    return buildResponse({ ok: false, error: 'Ação inválida. Use action=pedido.' });
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

  var headers = rows[0].map(String);
  var dataRows = rows.slice(1);

  var itens = dataRows.map(function(r) {
    var obj = {};
    headers.forEach(function(h, idx) {
      obj[h.trim().toLowerCase()] = r[idx];
    });
    return {
      id: String(obj['id'] || ''),
      nome: String(obj['nome'] || ''),
      descricao: String(obj['descrição'] || obj['descricao'] || ''),
      categoria: String(obj['categoria'] || ''),
      preco: Number(obj['preço'] || obj['preco'] || 0),
      imagem: String(obj['imagem'] || ''),
      ativo: String(obj['ativo'] || '').toLowerCase() === 'true' || obj['ativo'] === true
    };
  });

  return itens.filter(function(item) { return item.ativo; });
}

function salvarPedido(pedido) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Pedidos');
  if (!sheet) {
    sheet = ss.insertSheet('Pedidos');
    sheet.appendRow(['data', 'pedido_id', 'cliente', 'telefone', 'tipo_entrega', 'endereco', 'observacoes', 'itens', 'total']);
  }

  var pedidoId = 'PED-' + new Date().getTime();
  var dataHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  var itensLegiveis = pedido.itens.map(function(item) {
    return item.nome + ' x' + item.quantidade + ' = ' + item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }).join('\n');

  sheet.appendRow([
    dataHora,
    pedidoId,
    pedido.cliente || '',
    pedido.telefone || '',
    pedido.tipo_entrega || '',
    pedido.endereco || '',
    pedido.observacoes || '',
    itensLegiveis,
    Number(pedido.total || 0)
  ]);

  return { pedido_id: pedidoId };
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
