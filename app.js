
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = id => document.getElementById(id);

function num(id){
  const raw = ($(id).value || '0').replace(/\./g,'').replace(',', '.').replace(/[^\d.-]/g,'');
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
function money(v){ return brl.format(Math.max(0, v || 0)); }

function atualizarValorUnidade(){
  const opcao = $('unidade').options[$('unidade').selectedIndex];
  $('valorTabela').value = opcao?.dataset?.valor || '0';
  calcular();
}

function atualizarFormaPagamento(){
  const caixa = $('formaPagamento').value === 'caixa';
  $('campoFinanciamento').style.display = caixa ? '' : 'none';
  if(!caixa) $('financiamento').value = '0';
  calcular();
}

function addIntermediaria(data='', valor=0){
  const wrap = document.createElement('div');
  wrap.className = 'inter-row';
  wrap.innerHTML = `
    <label>Data / referência
      <input class="inter-data" type="text" placeholder="Ex.: dezembro/2027" value="${data}">
    </label>
    <label>Valor
      <input class="inter-valor" inputmode="decimal" value="${valor || 0}">
    </label>
    <button class="remove" type="button">Remover</button>`;
  wrap.querySelectorAll('input').forEach(i => i.addEventListener('input', calcular));
  wrap.querySelector('.remove').addEventListener('click', () => { wrap.remove(); calcular(); });
  $('intermediarias').appendChild(wrap);
  calcular();
}

function intermediarias(){
  return [...document.querySelectorAll('.inter-row')].map(row => ({
    data: row.querySelector('.inter-data').value.trim(),
    valor: (() => {
      const raw = row.querySelector('.inter-valor').value.replace(/\./g,'').replace(',', '.').replace(/[^\d.-]/g,'');
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    })()
  }));
}

function calcular(){
  const tabela = num('valorTabela');
  const desconto = num('desconto');
  const ato = num('ato');
  const atoRecomendado = tabela * 0.12;
  const forma = $('formaPagamento').value;
  const objetivo = $('objetivoCompra').value;
  const financiamento = forma === 'caixa' ? num('financiamento') : 0;
  const parcelaUnica = num('chaves');
  const qtd = Math.max(0, parseInt($('qtdMensais').value || '0', 10));
  const mensal = num('valorMensal');
  const inters = intermediarias();
  const totalInter = inters.reduce((s,x)=>s+x.valor,0);
  const precoFinal = Math.max(0, tabela - desconto);
  const totalMensais = qtd * mensal;
  const entradaTotal = ato + totalInter + parcelaUnica + totalMensais;
  const conferencia = entradaTotal + financiamento;
  const diferenca = conferencia - precoFinal;
  const propostaNaoConfere = Math.abs(diferenca) > 0.02;

  if($('atoRecomendado')){
    if(tabela <= 0){
      $('atoRecomendado').textContent = '💡 Selecione uma unidade para ver o ato recomendado de 12%.';
    } else if(ato < atoRecomendado){
      $('atoRecomendado').textContent = `💡 Ato recomendado (12%): ${money(atoRecomendado)}. O ato informado está abaixo da referência, mas isso não bloqueia a proposta.`;
    } else {
      $('atoRecomendado').textContent = `💡 Ato recomendado (12%): ${money(atoRecomendado)}. Referência comercial — não é uma trava.`;
    }
  }

  $('precoFinal').textContent = money(precoFinal);
  $('entradaTotal').textContent = money(entradaTotal);
  $('financiamentoResumo').textContent = money(financiamento);
  $('conferencia').textContent = money(conferencia);

  const empreendimento = $('empreendimento').value.trim();
  const unidade = $('unidade').value.trim();
  const unidadeR2V = unidade.startsWith('R2V');
  const airbnbIncompativel = objetivo === 'airbnb' && unidade && !unidadeR2V;
  const parcelaUnicaData = $('chavesData').value.trim();

  $('copiar').disabled = airbnbIncompativel || propostaNaoConfere;

  if(airbnbIncompativel){
    $('status').textContent = 'Proposta bloqueada: para Airbnb/short stay, selecione uma unidade R2V.';
    $('mensagem').value = [
      '⚠️ *PROPOSTA BLOQUEADA*',
      '',
      `🔑 *Unidade selecionada:* ${unidade}`,
      '🎯 *Objetivo:* Investimento – Airbnb/short stay',
      '',
      'Esta unidade não possui enquadramento R2V e não é compatível com a finalidade de Airbnb/short stay.',
      'Para gerar a proposta, selecione uma unidade R2V.'
    ].join('\n');
    return;
  }

  if(propostaNaoConfere){
    const falta = diferenca < 0;
    $('status').textContent = `Proposta bloqueada: ${falta ? 'faltam' : 'excedem'} ${money(Math.abs(diferenca))}.`;
    $('mensagem').value = [
      '🔴 *PROPOSTA NÃO CONFERE*',
      '',
      `💰 *Preço final:* ${money(precoFinal)}`,
      `📌 *Total informado:* ${money(conferencia)}`,
      `⚠️ *${falta ? 'Faltam' : 'Excedem'}:* ${money(Math.abs(diferenca))}`,
      '',
      'Revise ato, intermediárias, parcela única, mensais e financiamento.',
      'A composição precisa totalizar exatamente o preço final para liberar a mensagem ao cliente.'
    ].join('\n');
    return;
  }

  $('status').textContent = '✅ Proposta conferida. Mensagem liberada para envio.';

  const linhas = [];
  linhas.push('🏠 *SIMULAÇÃO DE PAGAMENTO*');
  if(empreendimento) linhas.push(`📍 *Empreendimento:* ${empreendimento}`);
  if(unidade) linhas.push(`🔑 *Unidade:* ${unidade}`);
  linhas.push(`🎯 *Objetivo:* ${objetivo === 'moradia' ? 'Moradia' : objetivo === 'investimento' ? 'Investimento – locação tradicional' : 'Investimento – Airbnb/short stay'}`);
  linhas.push(`🏦 *Forma de pagamento:* ${forma === 'caixa' ? 'Financiamento Caixa' : 'Direto com a construtora'}`);

  if(objetivo === 'airbnb' && unidadeR2V){
    linhas.push('');
    linhas.push('🏡 *Airbnb/short stay:* esta unidade R2V permite locação por curta duração, conforme seu enquadramento e autorização prevista na convenção do condomínio.');
  }

  linhas.push('');
  linhas.push(`💰 *Valor de tabela:* ${money(tabela)}`);
  if(desconto > 0){
    linhas.push(`🎁 *Desconto:* ${money(desconto)}`);
    linhas.push(`✅ *Preço final:* ${money(precoFinal)}`);
  }
  linhas.push('');
  if(ato > 0) linhas.push(`• Ato: *${money(ato)}*`);
  inters.filter(x=>x.valor>0).forEach(x=> linhas.push(`• Intermediária${x.data ? ` (${x.data})` : ''}: *${money(x.valor)}*`));
  if(parcelaUnica > 0) linhas.push(`• Parcela única${parcelaUnicaData ? ` (${parcelaUnicaData})` : ''}: *${money(parcelaUnica)}*`);
  if(qtd > 0 && mensal > 0) linhas.push(`• ${qtd} mensais de *${money(mensal)}*`);
  if(financiamento > 0) linhas.push(`• Financiamento Caixa: *${money(financiamento)}*`);
  linhas.push('');
  linhas.push(`📌 *Total da proposta:* ${money(conferencia)}`);

  linhas.push('');
  linhas.push('ℹ️ *Importante sobre o período de obras:*');
  linhas.push('As parcelas pagas à construtora durante o período de obras não possuem juros, sendo atualizadas pelo INCC, conforme previsto em contrato.');
  if(forma === 'caixa'){
    linhas.push('No financiamento pela Caixa Econômica Federal, durante a construção também haverá o pagamento dos encargos referentes à fase de obras (evolução de obras), conforme o andamento da construção e as condições do contrato de financiamento.');
  }
  linhas.push('');
  if(forma === 'caixa'){
    linhas.push('_Valores sujeitos à confirmação, disponibilidade da unidade e condições contratuais. Financiamento sujeito à análise e aprovação de crédito._');
  } else {
    linhas.push('_Valores sujeitos à confirmação, disponibilidade da unidade, atualização pelo INCC e demais condições contratuais._');
  }
  $('mensagem').value = linhas.join('\n');
}

['empreendimento','valorTabela','desconto','ato','financiamento','chaves','chavesData','qtdMensais','valorMensal'].forEach(id => $(id).addEventListener('input', calcular));
$('unidade').addEventListener('change', atualizarValorUnidade);
$('objetivoCompra').addEventListener('change', calcular);
$('formaPagamento').addEventListener('change', atualizarFormaPagamento);
$('addIntermediaria').addEventListener('click', () => addIntermediaria());

$('copiar').addEventListener('click', async () => {
  if($('copiar').disabled) return;
  try {
    await navigator.clipboard.writeText($('mensagem').value);
    $('status').textContent = 'Mensagem copiada. Agora é só colar no WhatsApp.';
  } catch {
    $('mensagem').select(); document.execCommand('copy'); $('status').textContent = 'Mensagem copiada.';
  }
});

$('btnExemplo').addEventListener('click', () => {
  $('empreendimento').value = 'TAG Guedala';
  $('unidade').value = 'R2V • 1 dormitório • 26 m²';
  $('objetivoCompra').value = 'moradia';
  $('formaPagamento').value = 'caixa';
  atualizarValorUnidade();
  $('desconto').value = '7000';
  $('ato').value = '10000';
  $('financiamento').value = '275200';
  $('chaves').value = '20000';
  $('chavesData').value = 'outubro/2028';
  $('qtdMensais').value = '25';
  $('valorMensal').value = '672';
  $('intermediarias').innerHTML = '';
  addIntermediaria('dezembro/2027',15000);
  atualizarFormaPagamento();
});

addIntermediaria();
atualizarFormaPagamento();
