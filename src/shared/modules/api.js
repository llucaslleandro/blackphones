import { CONFIG } from '../config.js';

export function registrarClickApi(produtoId) {
  // Enviar click ao backend via GET (fire-and-forget, sem bloquear a UI)
  fetch(`${CONFIG.apiBaseUrl}?action=click&produtoId=${encodeURIComponent(produtoId)}`)
    .catch(() => { }); // Silenciar erros de rede
}

export async function enviarPedidoApi(pedido) {
  try {
    const url = `${CONFIG.apiBaseUrl}?action=pedido`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(pedido)
    });

    if (!response.ok) throw new Error('Erro ao enviar pedido para a API.');

    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Serviço retornou erro.');

    return result;
  } catch (err) {
    throw new Error(err.message || 'Falha na API de pedidos.');
  }
}

export async function fetchProdutosApi() {
  const response = await fetch(`${CONFIG.apiBaseUrl}?action=produtos`);
  if (!response.ok) throw new Error('Falha ao buscar produtos do servidor.');

  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Erro na resposta do servidor.');
  if (!Array.isArray(data.data)) throw new Error('Formato de dados inesperado.');

  return data.data;
}

export async function fetchPedidosApi() {
  const response = await fetch(`${CONFIG.apiBaseUrl}?action=pedidos`);
  if (!response.ok) throw new Error('Falha ao buscar pedidos do servidor.');

  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Erro na resposta do servidor.');
  if (!Array.isArray(data.data)) throw new Error('Formato de dados inesperado em pedidos.');

  return data.data;
}
