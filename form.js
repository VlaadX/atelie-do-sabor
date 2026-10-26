/* Pré-inscrição demonstrativa. Dados vivem apenas nos campos desta página. */
(() => {
  'use strict';

  const COURSES = {
    essencial: { name: 'Culinária Essencial', cash: 480, installment: 130, units: 'por participante', batches: ['manha', 'noite', 'sabado'] },
    kids: { name: 'Culinária Kids', cash: 560, installment: 150, units: 'por dupla', batches: ['kids'] }
  };
  const BATCHES = {
    manha: { name: 'Manhã', schedule: 'Segundas e quartas, 8h–11h', duration: '4 semanas', day: 1, hour: 8, months: null },
    noite: { name: 'Noite', schedule: 'Terças e quintas, 19h–22h', duration: '4 semanas', day: 2, hour: 19, months: null },
    sabado: { name: 'Sábado', schedule: 'Sábados, 14h–17h', duration: '8 semanas', day: 6, hour: 14, months: [1, 3, 5, 7, 9] },
    kids: { name: 'Kids', schedule: 'Sábados, 9h–11h', duration: '8 semanas', day: 6, hour: 9, months: [1, 3, 5, 7, 9] }
  };
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const displayDate = iso => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));

  function upcomingStarts(batchId, reference = new Date(), count = 3) {
    const batch = BATCHES[batchId];
    if (!batch || !(reference instanceof Date) || Number.isNaN(reference.getTime())) return [];
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
    }).formatToParts(reference).map(part => [part.type, part.value]));
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    const dates = [];
    for (let offset = 0; offset < 36 && dates.length < Math.min(count, 12); offset += 1) {
      const monthStart = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1 + offset, 1));
      const month = monthStart.getUTCMonth();
      if (batch.months && !batch.months.includes(month)) continue;
      const day = 1 + (batch.day - monthStart.getUTCDay() + 7) % 7;
      const candidate = new Date(Date.UTC(monthStart.getUTCFullYear(), month, day));
      const iso = candidate.toISOString().slice(0, 10);
      if (iso < today || (iso === today && Number(parts.hour) >= batch.hour)) continue;
      dates.push({ iso, display: displayDate(iso), label: `${displayDate(iso)} — ${batch.name}`, schedule: batch.schedule, duration: batch.duration });
    }
    return dates;
  }
  const nextStart = (batchId, reference = new Date()) => upcomingStarts(batchId, reference, 1)[0] || null;
  const api = { nextStart, upcomingStarts, courses: COURSES, batches: BATCHES };
  globalThis.AtelieForm = api;
  if (typeof document === 'undefined') return;

  const form = document.getElementById('enrollment-form');
  if (!form) return;
  const byId = id => document.getElementById(id);
  const input = key => byId(`form-${key}`);
  const value = key => input(key).value.trim();
  const course = () => COURSES[value('course')];
  const batch = () => BATCHES[value('batch')];
  const isKids = () => value('course') === 'kids';
  const hasGuardian = () => isKids() || (value('age') !== '' && Number(value('age')) >= 13 && Number(value('age')) < 18);
  let currentStep = 1;
  let completing = false;
  let liveTimer;
  const activePointers = new Set();
  const pendingBlurValidation = new Set();
  let blurValidationTimer;

  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  function announce(text) {
    window.clearTimeout(liveTimer);
    input('live').textContent = '';
    liveTimer = window.setTimeout(() => { input('live').textContent = text; }, 50);
  }
  function clearFieldError(field) {
    field.removeAttribute('aria-invalid');
    const error = byId(`${field.id}-error`);
    if (error) { error.hidden = true; error.textContent = ''; }
    const summaryLink = input('errors-list').querySelector(`a[href="#${field.id}"]`);
    if (summaryLink) summaryLink.parentElement.remove();
    if (!input('errors-list').childElementCount) input('errors').hidden = true;
  }
  function setFieldError(field, message) {
    const error = byId(`${field.id}-error`);
    field.setAttribute('aria-invalid', 'true');
    if (error) { error.textContent = `⚠ ${message}`; error.hidden = false; }
  }
  function hideErrors() {
    input('errors').hidden = true;
    input('errors-list').replaceChildren();
  }
  function foodProvided() {
    return value('food') !== '' || (isKids() && value('guardian-food') !== '');
  }
  function updateFoodConsent() {
    const visible = foodProvided();
    const wasHidden = input('food-consent-wrap').hidden;
    input('food-consent-wrap').hidden = !visible;
    input('food-consent').disabled = !visible;
    input('food-consent').required = visible;
    if (!visible) clearFieldError(input('food-consent'));
    if (visible && wasHidden && currentStep === 2) announce('Uma autorização específica para as informações alimentares foi adicionada abaixo do campo.');
  }
  function updateGuardian(announceChange = false) {
    const needed = hasGuardian();
    const previous = !input('guardian-group').hidden;
    input('guardian-group').hidden = !needed;
    input('guardian-group').disabled = !needed;
    input('guardian-food-wrap').hidden = !isKids();
    input('guardian-food').disabled = !isKids();
    input('guardian-hint').textContent = isKids()
      ? 'No Kids, cada criança participa com um responsável adulto, que também cozinha. O valor é para a dupla.'
      : 'Para participantes de 13 a 17 anos, precisamos também dos dados de um responsável adulto.';
    input('contact-legend').textContent = needed ? 'Contato do responsável' : 'Contato do participante';
    input('contact-hint').textContent = needed
      ? 'O responsável é o contato da pré-inscrição; não é preciso repetir seu nome. Nenhuma mensagem será enviada.'
      : 'O nome do participante informado acima será reaproveitado. Nenhuma mensagem será enviada.';
    if (!needed) {
      clearFieldError(input('guardian'));
      clearFieldError(input('guardian-consent'));
    }
    updateFoodConsent();
    if (announceChange && needed !== previous) announce(needed
      ? 'Foram adicionados os dados do responsável, necessários para participantes menores de idade.'
      : 'Os dados de responsável não são necessários para participantes adultos.');
  }
  function updateParticipantRules() {
    input('age').min = isKids() ? '6' : '13';
    if (isKids()) input('age').max = '12';
    else input('age').removeAttribute('max');
    input('participant-legend').textContent = isKids() ? 'Dados da criança' : 'Dados de quem vai cozinhar';
    input('participant-hint').textContent = isKids()
      ? 'Culinária Kids: crianças de 6 a 12 anos. Um responsável adulto participa e cozinha junto.'
      : 'Culinária Essencial: a partir de 13 anos, sem limite de idade. Participantes de 13 a 17 anos precisam informar um responsável.';
    updateGuardian();
  }
  function updateContact() {
    const email = value('contact-method') === 'email';
    input('email-wrap').hidden = !email;
    input('email').disabled = !email;
    input('phone-wrap').hidden = email;
    input('phone').disabled = email;
    clearFieldError(email ? input('phone') : input('email'));
  }
  function updatePrices() {
    const selected = course();
    const options = input('payment').options;
    options[1].textContent = selected ? `${money(selected.cash)} à vista ${selected.units}` : 'À vista';
    options[2].textContent = selected ? `4 × ${money(selected.installment)} — total ${money(selected.installment * 4)}` : 'Em 4 vezes no cartão';
    updateChoiceNote();
  }
  function paymentText() {
    const selected = course();
    if (!selected) return '';
    return value('payment') === 'parcelado'
      ? `4 × ${money(selected.installment)} no cartão (total ${money(selected.installment * 4)}) ${selected.units}`
      : `${money(selected.cash)} à vista ${selected.units}`;
  }
  function updateChoiceNote() {
    const note = input('choice-note');
    const selected = course();
    note.hidden = !selected;
    note.replaceChildren();
    if (!selected) return;
    note.append(node('p', isKids()
      ? 'Uma criança de 6 a 12 anos + um responsável adulto. Os dois cozinham juntos.'
      : 'Para quem tem 13 anos ou mais. Não é preciso experiência. Menores de 18 anos informam um responsável.'));
    note.append(node('p', `${money(selected.cash)} à vista ou 4 × ${money(selected.installment)} no cartão, total ${money(selected.installment * 4)} ${selected.units}.`));
    if (batch() && value('start')) {
      const p = node('p');
      p.append(node('strong', `Início em ${displayDate(value('start'))}. `), document.createTextNode(`${batch().schedule}. Duração: ${batch().duration}.`));
      note.append(p);
    }
  }
  function updateDates(keepSelection = true) {
    const oldDate = value('start');
    const dates = upcomingStarts(value('batch'));
    input('start').replaceChildren();
    const placeholder = node('option', dates.length ? 'Selecione uma data' : 'Selecione a turma acima');
    placeholder.value = '';
    input('start').append(placeholder);
    for (const date of dates) {
      const option = node('option', date.display);
      option.value = date.iso;
      input('start').append(option);
    }
    if (keepSelection && dates.some(date => date.iso === oldDate)) input('start').value = oldDate;
    input('start-hint').textContent = batch()
      ? (['kids', 'sabado'].includes(value('batch'))
        ? 'Primeiro sábado de fevereiro, abril, junho, agosto e outubro. Escolha um dos próximos inícios.'
        : `Início todo mês, na primeira ${value('batch') === 'manha' ? 'segunda' : 'terça'}-feira. Escolha uma data.`)
      : 'Selecione a turma para consultar os próximos inícios.';
    if (batch() && !dates.length) input('start-hint').textContent = 'Não foi possível calcular os próximos inícios. Confira as regras nas informações das turmas e tente selecionar novamente.';
    clearFieldError(input('start'));
    updateChoiceNote();
  }
  function updateBatches() {
    const selected = course();
    const previous = value('batch');
    input('batch').replaceChildren();
    const placeholder = node('option', selected ? 'Selecione uma turma' : 'Selecione o curso acima');
    placeholder.value = '';
    input('batch').append(placeholder);
    if (selected) for (const key of selected.batches) {
      const option = node('option', `${BATCHES[key].name} — ${BATCHES[key].schedule}`);
      option.value = key;
      input('batch').append(option);
    }
    if (selected && selected.batches.includes(previous)) input('batch').value = previous;
    else if (isKids()) input('batch').value = 'kids';
    input('batch-hint').textContent = selected
      ? (isKids() ? 'O Kids tem uma turma: sábado de manhã, durante 8 semanas.' : 'Manhã e noite: 4 semanas. Sábado: 8 semanas.')
      : 'Primeiro, selecione o curso para ver os horários.';
    clearFieldError(input('batch'));
    updateDates();
    updatePrices();
    updateParticipantRules();
  }
  function validName(text) { return text.length >= 2 && /\p{L}/u.test(text); }
  function fieldError(field) {
    if (field.matches(':disabled')) return '';
    const raw = field.value.trim();
    switch (field.id) {
      case 'form-course': return COURSES[raw] ? '' : 'Escolha Culinária Essencial ou Culinária Kids.';
      case 'form-batch': return course()?.batches.includes(raw) ? '' : 'Escolha uma turma disponível para o curso selecionado.';
      case 'form-start': return upcomingStarts(value('batch'), new Date(), 12).some(date => date.iso === raw) ? '' : 'Escolha uma data futura de início para esta turma.';
      case 'form-payment': return ['avista', 'parcelado'].includes(raw) ? '' : 'Escolha pagamento à vista ou em 4 vezes no cartão.';
      case 'form-name': return validName(raw) ? '' : 'Informe o nome do participante, com pelo menos 2 caracteres.';
      case 'form-age': {
        if (!raw || !Number.isInteger(Number(raw))) return 'Informe a idade em anos completos, usando apenas números inteiros.';
        if (isKids() && (Number(raw) < 6 || Number(raw) > 12)) return 'O Kids é para crianças de 6 a 12 anos. Corrija a idade ou volte para escolher o Essencial, a partir de 13 anos.';
        if (!isKids() && Number(raw) < 13) return 'O Essencial é para pessoas a partir de 13 anos. Corrija a idade ou escolha o Kids, de 6 a 12 anos.';
        return '';
      }
      case 'form-guardian': return validName(raw) ? '' : 'Informe o nome do responsável adulto, com pelo menos 2 caracteres.';
      case 'form-guardian-consent': return field.checked ? '' : 'A autorização do responsável é necessária para continuar com os dados de um menor de idade.';
      case 'form-email': {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return 'Informe um e-mail completo, como pessoa@example.com.';
        const domain = raw.split('@')[1].toLowerCase();
        const suggestions = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com' };
        input('email-hint').textContent = suggestions[domain]
          ? `Confira o domínio: você quis dizer ${suggestions[domain]}? Se o endereço estiver certo, pode continuar.`
          : 'Exemplo fictício: pessoa@example.com';
        return '';
      }
      case 'form-phone': {
        let digits = raw.replace(/\D/g, '');
        if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
        return /^[+\d\s().-]+$/.test(raw) && /^(?:[1-9]\d)\d{8,9}$/.test(digits) ? '' : 'Informe um telefone com DDD e 10 ou 11 dígitos. Você pode usar espaços, parênteses e hífen.';
      }
      case 'form-food-consent': return !foodProvided() || field.checked ? '' : 'Autorize o uso das informações alimentares nesta simulação ou apague essas informações opcionais para continuar.';
      default: return '';
    }
  }
  function validateField(field) {
    const message = fieldError(field);
    if (message) setFieldError(field, message);
    else clearFieldError(field);
    return message;
  }
  function fieldsForStep(number) {
    const ids = number === 1
      ? ['course', 'batch', 'start', 'payment']
      : ['name', 'age', 'guardian', 'guardian-consent', 'email', 'phone', 'food-consent'];
    return ids.map(input).filter(field => !field.matches(':disabled'));
  }
  function validateStep(number, focus = true) {
    updateGuardian();
    updateFoodConsent();
    const errors = fieldsForStep(number).map(field => ({ field, message: validateField(field) })).filter(item => item.message);
    hideErrors();
    if (!errors.length) return true;
    if (errors.length === 1) {
      if (focus) errors[0].field.focus();
      announce(`Confira o campo. ${errors[0].message}`);
    } else {
      for (const { field, message } of errors) {
        const li = node('li');
        const link = node('a', message);
        link.href = `#${field.id}`;
        link.addEventListener('click', event => { event.preventDefault(); field.focus(); });
        li.append(link);
        input('errors-list').append(li);
      }
      input('errors').hidden = false;
      if (focus) input('errors').focus();
    }
    return false;
  }
  function showStep(number, focus = true) {
    currentStep = number;
    hideErrors();
    form.hidden = false;
    input('success').hidden = true;
    document.querySelectorAll('.form-step').forEach(step => { step.hidden = Number(step.dataset.step) !== number; });
    document.querySelectorAll('.form-progress li').forEach((item, index) => {
      if (index + 1 === number) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    if (number === 3) renderReview(input('review'), true);
    if (focus) document.querySelector(`.form-step[data-step="${number}"] .form-step-title`).focus();
  }
  function addReviewBlock(target, title, pairs, editStep) {
    const block = node('div', null, 'form-review-block');
    const heading = node('div', null, 'form-review-heading');
    heading.append(node('h4', title));
    if (editStep) {
      const edit = node('button', `Editar ${editStep === 1 ? 'curso e turma' : 'participantes'}`);
      edit.type = 'button';
      edit.addEventListener('click', () => showStep(editStep));
      heading.append(edit);
    }
    block.append(heading);
    const list = node('dl');
    for (const [label, text] of pairs) list.append(node('dt', label), node('dd', text));
    block.append(list);
    target.append(block);
  }
  function renderReview(target, editable) {
    target.replaceChildren();
    addReviewBlock(target, 'Sua turma', [
      ['Curso', course().name], ['Turma', batch().name], ['Horário', batch().schedule],
      ['Início', displayDate(value('start'))], ['Duração', batch().duration], ['Valor', paymentText()]
    ], editable ? 1 : null);
    const people = [['Participante', `${value('name')}, ${value('age')} anos`]];
    if (hasGuardian()) people.push([isKids() ? 'Responsável que cozinha junto' : 'Responsável', value('guardian')]);
    people.push([value('contact-method') === 'email' ? 'E-mail' : 'WhatsApp', value(value('contact-method') === 'email' ? 'email' : 'phone')]);
    people.push(['Alergias e restrições do participante', value('food') || 'Não informadas']);
    if (isKids()) people.push(['Alergias e restrições do responsável', value('guardian-food') || 'Não informadas']);
    addReviewBlock(target, 'Quem participa', people, editable ? 2 : null);
  }
  function nextStep(number) {
    if (completing || !validateStep(currentStep)) return;
    if (number === 3 && !validateStep(1, false)) { showStep(1); validateStep(1); return; }
    showStep(number);
  }
  function selectCourse(id, batchId) {
    if (!COURSES[id] || completing) return;
    input('course').value = id;
    updateBatches();
    if (batchId && COURSES[id].batches.includes(batchId)) {
      input('batch').value = batchId;
      updateDates(false);
    }
    clearFieldError(input('course'));
    showStep(1, false);
    announce(`${COURSES[id].name} selecionado. Escolha a turma, a data de início e a forma de pagamento.`);
  }
  api.selectCourse = selectCourse;

  // A pointer changes focus before its click is released. Removing an error at
  // that moment can move the intended button out from under the pointer. Defer
  // blur-only rendering until the click has finished; keyboard blur stays immediate.
  function validateBlurredField(field) {
    const step = field.closest('.form-step');
    if (form.hidden || !step || step.hidden || field.matches(':disabled') || !fieldsForStep(currentStep).includes(field)) return;
    validateField(field);
  }
  function flushBlurValidation() {
    if (activePointers.size) return;
    const fields = Array.from(pendingBlurValidation);
    pendingBlurValidation.clear();
    fields.forEach(validateBlurredField);
  }
  function scheduleBlurValidation() {
    window.clearTimeout(blurValidationTimer);
    blurValidationTimer = window.setTimeout(flushBlurValidation, 0);
  }
  document.addEventListener('pointerdown', event => {
    activePointers.add(event.pointerId);
  }, true);
  for (const eventName of ['pointerup', 'pointercancel']) document.addEventListener(eventName, event => {
    activePointers.delete(event.pointerId);
    scheduleBlurValidation();
  }, true);
  window.addEventListener('blur', () => {
    activePointers.clear();
    scheduleBlurValidation();
  });

  input('course').addEventListener('change', () => { updateBatches(); announce('As turmas e os valores foram atualizados para o curso selecionado.'); });
  input('batch').addEventListener('change', () => { updateDates(false); announce('As próximas datas de início foram atualizadas.'); });
  input('start').addEventListener('change', updateChoiceNote);
  input('payment').addEventListener('change', updateChoiceNote);
  input('age').addEventListener('input', () => updateGuardian(true));
  input('contact-method').addEventListener('change', () => { updateContact(); announce(`Campo de ${value('contact-method') === 'email' ? 'e-mail' : 'WhatsApp'} disponível abaixo.`); });
  input('food').addEventListener('input', updateFoodConsent);
  input('guardian-food').addEventListener('input', updateFoodConsent);
  for (const field of form.querySelectorAll('input, select, textarea')) field.addEventListener('blur', () => {
    if (activePointers.size) pendingBlurValidation.add(field);
    else validateBlurredField(field);
  });
  for (const button of form.querySelectorAll('[data-next]')) button.addEventListener('click', () => nextStep(Number(button.dataset.next)));
  for (const button of form.querySelectorAll('[data-back]')) button.addEventListener('click', () => { if (!completing) showStep(Number(button.dataset.back)); });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-course]');
    if (link) selectCourse(link.dataset.course, link.dataset.batch);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (completing) return;
    if (currentStep < 3) { nextStep(currentStep + 1); return; }
    for (const number of [1, 2]) {
      if (!validateStep(number, false)) { showStep(number); validateStep(number); return; }
    }
    completing = true;
    input('submit').disabled = true;
    input('submit').textContent = 'Concluindo simulação…';
    form.setAttribute('aria-busy', 'true');
    announce('Concluindo a simulação. Nenhum dado está sendo enviado.');
    window.setTimeout(() => {
      renderReview(input('success-summary'), false);
      form.hidden = true;
      input('success').hidden = false;
      document.querySelectorAll('.form-progress li').forEach(item => item.removeAttribute('aria-current'));
      form.removeAttribute('aria-busy');
      input('submit').disabled = false;
      input('submit').textContent = 'Concluir simulação';
      completing = false;
      input('success-title').focus();
      announce('Simulação concluída. Nenhum dado foi enviado ou armazenado. Nenhuma vaga foi reservada. O resumo da sua escolha está disponível a seguir.');
    }, 350);
  });
  input('edit-again').addEventListener('click', () => showStep(3));
  updateBatches();
  updateContact();
  input('interactive').hidden = false;
})();
