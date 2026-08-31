
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
  const forma = $('formaPagamento').value;
  const financiamento = forma === 'caixa' ? num('financiamento') : 0;
  const chaves = num('chaves');
  const qtd = Math.max(0, parseInt($('qtdMensais').value || '0', 10));
  const inters = intermediarias();
  const totalInter = inters.reduce((s,x)=>s+x.valor,0);
  const precoFinal = Math.max(0, tabela - desconto);
  const reservado = ato + totalInter + chaves + financiamento;
  const saldoMensais = Math.max(0, precoFinal - reservado);
  const mensal = qtd > 0 ? saldoMensais / qtd : 0;
  const entradaTotal = ato + totalInter + chaves + saldoMensais;
  const conferencia = entradaTotal + financiamento;

  $('precoFinal').textContent = money(precoFinal);
  $('entradaTotal').textContent = money(entradaTotal);
  $('financiamentoResumo').textContent = money(financiamento);
  $('conferencia').textContent = money(conferencia);
  $('valorMensal').textContent = qtd > 0 ? `${qtd}x de ${money(mensal)}` : money(0);

  const empreendimento = $('empreendimento').value.trim();
  const unidade = $('unidade').value.trim();
  const chavesData = $('chavesData').value.trim();
  const linhas = [];
  linhas.push('🏠 *SIMULAÇÃO DE PAGAMENTO*');
  if(empreendimento) linhas.push(`📍 *Empreendimento:* ${empreendimento}`);
  if(unidade) linhas.push(`🔑 *Unidade:* ${unidade}`);
  linhas.push(`🏦 *Forma de pagamento:* ${forma === 'caixa' ? 'Financiamento Caixa' : 'Direto com a construtora'}`);
  linhas.push('');
  linhas.push(`💰 *Valor de tabela:* ${money(tabela)}`);
  if(desconto > 0){
    linhas.push(`🎁 *Desconto:* ${money(desconto)}`);
    linhas.push(`✅ *Preço final:* ${money(precoFinal)}`);
  }
  linhas.push('');
  if(ato > 0) linhas.push(`• Ato: *${money(ato)}*`);
  inters.filter(x=>x.valor>0).forEach(x=> linhas.push(`• ${x.data || 'Intermediária'}: *${money(x.valor)}*`));
  if(chaves > 0) linhas.push(`• Chaves${chavesData ? ` (${chavesData})` : ''}: *${money(chaves)}*`);
  if(qtd > 0 && saldoMensais > 0) linhas.push(`• ${qtd} mensais de *${money(mensal)}*`);
  if(financiamento > 0) linhas.push(`• Financiamento Caixa: *${money(financiamento)}*`);
  linhas.push('');
  linhas.push(`📌 *Total da proposta:* ${money(conferencia)}`);

  if(Math.abs(conferencia - precoFinal) > 0.02){
    linhas.push(`⚠️ Atenção: a composição acima difere do preço final em ${money(Math.abs(conferencia-precoFinal))}.`);
  }

  linhas.push('');
  linhas.push('ℹ️ *Importante sobre o período de obras:*');
  linhas.push('As parcelas pagas à construtora durante o período de obras não possuem juros, sendo atualizadas pelo INCC, conforme previsto em contrato.');
  if(forma === 'caixa'){
    linhas.push('No financiamento pela Caixa Econômica Federal, durante a construção também haverá o pagamento dos encargos referentes à fase de obras (evolução de obras), conforme o andamento da construção e as condições do contrato de financiamento.');
  }
  linhas.push('');
  linhas.push('_Valores sujeitos à confirmação, disponibilidade da unidade e condições contratuais. Quando houver financiamento, sujeito à análise e aprovação de crédito._');
  $('mensagem').value = linhas.join('\n');
}

['empreendimento','valorTabela','desconto','ato','financiamento','chaves','chavesData','qtdMensais'].forEach(id => $(id).addEventListener('input', calcular));
$('unidade').addEventListener('change', atualizarValorUnidade);
$('formaPagamento').addEventListener('change', atualizarFormaPagamento);
$('addIntermediaria').addEventListener('click', () => addIntermediaria());

$('copiar').addEventListener('click', async () => {
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
  $('formaPagamento').value = 'caixa';
  atualizarValorUnidade();
  $('desconto').value = '7000';
  $('ato').value = '10000';
  $('financiamento').value = '275200';
  $('chaves').value = '20000';
  $('chavesData').value = 'outubro/2028';
  $('qtdMensais').value = '25';
  $('intermediarias').innerHTML = '';
  addIntermediaria('dezembro/2027',15000);
  atualizarFormaPagamento();
});

addIntermediaria();
atualizarFormaPagamento();
