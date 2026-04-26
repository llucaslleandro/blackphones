import { state } from './store.js';
import { formatMoney } from './ui.js';

// Coordenadas fixas para o template do recibo (Black Phones)
// Valores em mm (A4 padrão: 210 x 297)
const COORDS = {
  data: { x: 24, y: 37 },
  codigo: { x: 166, y: 37 },
  nomeCliente: { x: 9, y: 61 },
  cpfCnpj: { x: 83, y: 61 },
  telefone: { x: 117, y: 61 },
  email: { x: 160, y: 61 },
  endereco: { x: 9, y: 77 },
  cidadeEstado: { x: 117, y: 77 },

  // Grid de Itens
  categoria: { x: 9, y: 100 },
  modelo: { x: 38, y: 100 },
  versao: { x: 63, y: 100 },
  cor: { x: 82, y: 100 },
  imei: { x: 101, y: 100 },
  imei2: { x: 101, y: 115 },
  memoria: { x: 134, y: 100 },
  bateria: { x: 153, y: 100 },
  condicao: { x: 9, y: 115 },
  quantidade: { x: 173, y: 100 },
  valor: { x: 182, y: 100 },

  // Totais
  subtotal: { x: 172, y: 109 },
  totalFinal: { x: 175, y: 116 },

  // Pagamento
  vencimento: { x: 9, y: 140 },
  valorPagamento: { x: 62, y: 140 },
  metodoPagamento: { x: 102, y: 140 },
  dataPagamento: { x: 155, y: 140 }
};

const TEMPLATE_URL_NOVO = '../../assets/images/recibo-template-novo.png';
const TEMPLATE_URL_SEMINOVO = '../../assets/images/recibo-template-seminovo.png';

export function initReceiptModal() {
  const modal = document.getElementById('modal-recibo');
  const btnClose = document.getElementById('recibo-close');
  const btnCancel = document.getElementById('recibo-cancel');
  const btnGenerate = document.getElementById('recibo-generate');

  if (!modal) return;

  const close = () => modal.classList.add('hidden');
  btnClose.onclick = close;
  btnCancel.onclick = close;

  btnGenerate.onclick = async () => {
    const nome = document.getElementById('rec-nome').value.trim();
    const cpf = document.getElementById('rec-cpf').value.trim();
    const tel = document.getElementById('rec-tel').value.trim();

    const cleanCpf = cpf.replace(/\D/g, "");
    const cleanTel = tel.replace(/\D/g, "");
    const isCpfValid = cleanCpf.length === 11 || cleanCpf.length === 14;
    const isTelValid = cleanTel.length >= 10 && cleanTel.length <= 11;

    if (!nome || !isCpfValid || !isTelValid) {
      if (!nome) {
        alert('Por favor, preencha o Nome do cliente.');
      } else if (!isCpfValid) {
        alert('O CPF/CNPJ deve conter 11 ou 14 dígitos.');
      } else if (!isTelValid) {
        alert('O Telefone deve conter entre 10 e 11 dígitos.');
      }

      // Highlight fields
      document.getElementById('rec-nome').classList.toggle('border-red-500', !nome);
      document.getElementById('rec-cpf').classList.toggle('border-red-500', !isCpfValid);
      document.getElementById('rec-tel').classList.toggle('border-red-500', !isTelValid);

      return;
    }

    // Clear red borders if all valid
    ['rec-nome', 'rec-cpf', 'rec-tel'].forEach(id => {
      document.getElementById(id).classList.remove('border-red-500');
    });

    btnGenerate.disabled = true;
    btnGenerate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';

    try {
      await generatePDF();
      close();
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar PDF. Verifique se o template existe em assets/images/');
    } finally {
      btnGenerate.disabled = false;
      btnGenerate.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Gerar Recibo';
    }
  };

  // CPF/CNPJ Mask
  const inpCpf = document.getElementById('rec-cpf');
  if (inpCpf) {
    inpCpf.addEventListener('input', (e) => {
      e.target.value = formatCpfCnpj(e.target.value);
    });
  }

  // Phone Mask
  const inpTel = document.getElementById('rec-tel');
  if (inpTel) {
    inpTel.addEventListener('input', (e) => {
      e.target.value = formatPhone(e.target.value);
    });
  }

  // Delegate event for table buttons
  document.getElementById('orders-table-body')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-gerar-recibo');
    if (btn) {
      try {
        const id = btn.dataset.id;
        console.log('Tentando gerar recibo para ID:', id);

        // Search by either item_id or id_do_pedido to be safe
        const order = state.allOrders.find(o =>
          (o.item_id && String(o.item_id) === String(id)) ||
          (o.id_do_pedido && String(o.id_do_pedido) === String(id))
        );

        if (order) {
          abrirModalRecibo(order);
        } else {
          console.warn('Pedido não encontrado para o ID:', id, 'Pedidos disponíveis:', state.allOrders.length);
          alert('Erro: Dados do pedido não encontrados na memória do dashboard. Tente recarregar a página (F5).');
        }
      } catch (err) {
        console.error('Erro ao abrir modal de recibo:', err);
        alert('Erro inesperado ao processar o recibo: ' + err.message);
      }
    }
  });
}

export function abrirModalRecibo(order) {
  const modal = document.getElementById('modal-recibo');
  if (!modal) return;

  const hoje = new Date();
  const dataVenda = hoje.toISOString().split('T')[0];

  // Calcula vencimento (padrão 3 meses)
  const venc = new Date();
  venc.setMonth(venc.getMonth() + 3);
  const dataVenc = venc.toISOString().split('T')[0];

  const total = order.final_price || order.total || 0;

  // Pre-fill fields
  document.getElementById('rec-nome').value = order.cliente || '';
  document.getElementById('rec-cpf').value = '';
  document.getElementById('rec-tel').value = formatPhone(order.telefone || '');
  document.getElementById('rec-email').value = order.email || '';

  document.getElementById('rec-endereco').value = order.endereco || '';
  document.getElementById('rec-cidade-estado').value = order.cidade || '';

  // Buscar detalhes adicionais no estoque se existirem
  let p = {};
  if (order.item_id || order.id_do_pedido) {
    p = state.allProducts.find(prod => String(prod.sku || prod.id) === String(order.item_id || order.id_do_pedido)) || {};
  }
  if (!p.id) {
    p = state.allProducts.find(prod => prod.nome === order.produto) || {};
  }

  document.getElementById('rec-modelo').value = order.produto || p.nome || '';
  document.getElementById('rec-versao').value = order.versao || p.versao || '';
  document.getElementById('rec-imei').value = order.imei_1 || order.imei1 || p.imei1 || p.imei_1 || '';
  document.getElementById('rec-imei2').value = order.imei_2 || order.imei2 || p.imei2 || p.imei_2 || '';
  document.getElementById('rec-cor').value = order.cor || p.cor || '';
  document.getElementById('rec-memoria').value = order.armazenamento || p.armazenamento || '';

  const condicaoFinal = order.condicao || p.condicao || 'Novo';
  let condStr = 'Novo';
  if (condicaoFinal.toLowerCase().includes('seminovo')) {
    condStr = 'Seminovo';
  }
  document.getElementById('rec-condicao').value = condStr;

  // Bateria - Safe check & Percentage formatting
  let batValue = order.saude_bateria || p.saude_bateria || p.saude;
  let batStr = '';

  if (batValue !== undefined && batValue !== null && batValue !== '') {
    let n = Number(batValue);
    // If it's a decimal <= 1 (like 0.84), multiply by 100
    if (!isNaN(n) && n > 0 && n <= 1) {
      batStr = String(Math.round(n * 100));
    } else {
      batStr = String(batValue).replace('%', '').trim();
    }
  }
  document.getElementById('rec-bateria').value = batStr;

  document.getElementById('rec-qtd').value = order.quantidade || 1;
  document.getElementById('rec-categoria').value = order.categoria || 'Smartphone';

  document.getElementById('rec-subtotal').value = total;
  document.getElementById('rec-total').value = total;
  document.getElementById('rec-valor-pago').value = total;
  document.getElementById('rec-metodo').value = 'PIX';
  document.getElementById('rec-data').value = dataVenda;
  document.getElementById('rec-vencimento').value = dataVenc;

  // Reset validation styles
  ['rec-nome', 'rec-cpf', 'rec-tel'].forEach(id => {
    document.getElementById(id).classList.remove('border-red-500');
  });

  modal.dataset.orderId = order.id_do_pedido || '';
  modal.classList.remove('hidden');
}

async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  const getVal = (id) => document.getElementById(id).value || '';
  const condicao = getVal('rec-condicao');
  const templateUrl = condicao === 'Seminovo' ? TEMPLATE_URL_SEMINOVO : TEMPLATE_URL_NOVO;

  // Load template
  let img;
  try {
    img = await loadImage(templateUrl);
  } catch (err) {
    console.warn(`Template para ${condicao} não encontrado, usando padrão.`);
    img = await loadImage(TEMPLATE_URL_NOVO);
  }
  doc.addImage(img, 'PNG', 0, 0, 210, 297);

  // Setup font
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);


  const orderId = document.getElementById('modal-recibo').dataset.orderId || '';
  const last4 = orderId ? String(orderId).slice(-4) : (Math.floor(Math.random() * 9000) + 1000);

  // Overlay text
  const fields = {
    data: formatDate(getVal('rec-data')),
    codigo: '#' + last4,
    nomeCliente: getVal('rec-nome'),
    cpfCnpj: getVal('rec-cpf'),
    telefone: getVal('rec-tel'),
    email: getVal('rec-email'),
    endereco: getVal('rec-endereco'),
    cidadeEstado: getVal('rec-cidade-estado'),
    categoria: getVal('rec-categoria'),
    modelo: getVal('rec-modelo'),
    versao: getVal('rec-versao'),
    cor: getVal('rec-cor'),
    imei: getVal('rec-imei'),
    imei2: getVal('rec-imei2'),
    memoria: getVal('rec-memoria'),
    bateria: getVal('rec-bateria') ? getVal('rec-bateria') + '%' : '',
    condicao: getVal('rec-condicao'),
    quantidade: getVal('rec-qtd').padStart(2, '0'),
    valor: formatMoney(getVal('rec-total')),
    subtotal: formatMoney(getVal('rec-subtotal')),
    totalFinal: formatMoney(getVal('rec-total')),
    vencimento: formatDate(getVal('rec-vencimento')),
    valorPagamento: formatMoney(getVal('rec-valor-pago')),
    metodoPagamento: getVal('rec-metodo'),
    dataPagamento: formatDate(getVal('rec-data'))
  };

  Object.keys(fields).forEach(key => {
    const pos = COORDS[key];
    if (pos) {
      if (key === 'data' || key === 'codigo') {
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(40, 40, 40);
      }
      doc.text(String(fields[key]), pos.x, pos.y);
    }
  });

  doc.save(`Recibo_BlackPhones_${getVal('rec-condicao')}_${getVal('rec-nome').replace(/\s+/g, '_')}.pdf`);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatCpfCnpj(val) {
  let v = val.replace(/\D/g, ""); // Remove não dígitos

  if (v.length <= 11) {
    // CPF
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    // CNPJ
    v = v.slice(0, 14); // Limita a 14
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
  }
  return v;
}

function formatPhone(val) {
  let v = val.replace(/\D/g, ""); // Remove não dígitos
  if (v.length > 11) v = v.slice(0, 11); // Limita a 11 dígitos

  if (v.length > 10) {
    // Formato (XX) XXXXX-XXXX
    return "(" + v.substring(0, 2) + ") " + v.substring(2, 7) + "-" + v.substring(7);
  } else if (v.length > 6) {
    // Formato (XX) XXXX-XXXX
    return "(" + v.substring(0, 2) + ") " + v.substring(2, 6) + "-" + v.substring(6);
  } else if (v.length > 2) {
    // Formato (XX) XXXX
    return "(" + v.substring(0, 2) + ") " + v.substring(2);
  } else if (v.length > 0) {
    // Formato (XX
    return "(" + v;
  }
  return v;
}
