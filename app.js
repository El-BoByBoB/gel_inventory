'use strict';

const STORAGE_KEY = 'gel-studio-inventory-v1';
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const norm = value => String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const dollars = amount => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(amount);
const validHex = value => /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#dca9b8';
let inventory = [];
let activeMenu = null;
let toastTimer = null;

function readStore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data.map(sanitizeItem).filter(Boolean) : [];
  } catch (error) {
    console.warn('No fue posible leer el inventario', error);
    showToast('No se pudieron leer los datos. Importa un respaldo.');
    return [];
  }
}

function sanitizeItem(item) {
  if (!item || typeof item !== 'object' || ![item.brand,item.code,item.color,item.type].every(v => typeof v === 'string' && v.trim())) return null;
  const price = Number(item.price);
  const quantity = Number(item.quantity);
  return {
    id: typeof item.id === 'string' && item.id.length < 100 ? item.id : makeId(),
    brand: String(item.brand).trim().slice(0,65),
    code: String(item.code).trim().slice(0,65),
    color: String(item.color).trim().slice(0,75),
    type: String(item.type).trim().slice(0,65),
    price: Number.isFinite(price) && price >= 0 && price <= 999999 ? Math.round(price*100)/100 : 0,
    quantity: Number.isSafeInteger(quantity) && quantity >= 0 && quantity <= 999999 ? quantity : 0,
    swatch: validHex(item.swatch),
    notes: String(item.notes ?? '').slice(0,250),
    createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : Date.now()
  };
}

function makeId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID() : `gel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function saveStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
    return true;
  } catch (error) {
    console.error('Error guardando inventario', error);
    alert('No se pudo guardar. Comprueba el almacenamiento del dispositivo y exporta un respaldo.');
    return false;
  }
}

function showToast(message) {
  const element = $('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 3100);
}

function uniqueValues(key) {
  const byNorm = new Map();
  inventory.forEach(item => {
    const name = item[key].trim();
    if (name && !byNorm.has(norm(name))) byNorm.set(norm(name), name);
  });
  return [...byNorm.values()].sort((a,b) => a.localeCompare(b,'es',{sensitivity:'base'}));
}

function refreshFilters() {
  for (const [selector,key,label] of [['#brandFilter','brand','Todas las marcas'],['#typeFilter','type','Todos los tipos'],['#colorFilter','color','Todos los colores']]) {
    const select = $(selector);
    const previous = select.value;
    const values = uniqueValues(key);
    select.replaceChildren();
    const all = document.createElement('option');
    all.value = '';
    all.textContent = label;
    select.append(all);
    values.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
    const match = values.find(value => norm(value) === norm(previous));
    select.value = match || '';
  }
  const suggestions = $('#brandSuggestions');
  suggestions.replaceChildren();
  uniqueValues('brand').forEach(value => {
    const option = document.createElement('option'); option.value = value; suggestions.append(option);
  });
  const typeSuggestions = $('#typeSuggestions');
  const current = new Set([...typeSuggestions.options].map(opt => norm(opt.value)));
  uniqueValues('type').forEach(value => {
    if (current.has(norm(value))) return;
    const option = document.createElement('option'); option.value = value; typeSuggestions.append(option);
  });
}

function filteredItems() {
  const query = norm($('#searchInput').value);
  const filters = [['brand','#brandFilter'],['type','#typeFilter'],['color','#colorFilter']];
  const items = inventory.filter(item => {
    if (query && !norm([item.brand,item.code,item.color,item.type,item.notes].join(' ')).includes(query)) return false;
    return filters.every(([key,selector]) => !$(selector).value || norm(item[key]) === norm($(selector).value));
  });
  switch ($('#sortSelect').value) {
    case 'recent': items.sort((a,b) => b.createdAt - a.createdAt); break;
    case 'priceHigh': items.sort((a,b) => b.price - a.price); break;
    case 'priceLow': items.sort((a,b) => a.price - b.price); break;
    case 'quantity': items.sort((a,b) => b.quantity - a.quantity); break;
    default: items.sort((a,b) => a.color.localeCompare(b.color,'es',{numeric:true,sensitivity:'base'}));
  }
  return items;
}

function productCard(item) {
  const shade = validHex(item.swatch);
  const name = escapeHtml(item.color);
  const label = escapeHtml(item.brand);
  const code = escapeHtml(item.code);
  const type = escapeHtml(item.type);
  const notes = escapeHtml(item.notes);
  return `<article class="product-card" data-id="${escapeHtml(item.id)}">
    <span class="gel-swatch" style="background:${shade}" aria-label="Muestra de ${name}"></span>
    <div class="product-info">
      <div class="product-brand">${label}</div><div class="product-name">${name}</div>
      <div class="product-code">Código: ${code}</div><div class="product-meta" title="${notes}">${type}${notes ? ' · 📝 Notas' : ''}</div>
      <div class="product-bottom"><span class="product-price">${dollars(item.price)}</span><span class="stock-pill ${item.quantity===0?'out':''}">${item.quantity === 0 ? 'Sin stock' : `× ${item.quantity} unid.`}</span></div>
    </div>
    <button class="card-menu" type="button" data-action="menu" data-id="${escapeHtml(item.id)}" aria-label="Opciones de ${name}" aria-expanded="${activeMenu === item.id}">⋯</button>
    ${activeMenu === item.id ? `<div class="menu-pop"><button type="button" data-action="edit" data-id="${escapeHtml(item.id)}">Editar gel</button><button type="button" data-action="duplicate" data-id="${escapeHtml(item.id)}">Duplicar</button><button type="button" class="danger" data-action="delete" data-id="${escapeHtml(item.id)}">Eliminar</button></div>` : ''}
  </article>`;
}

function render() {
  $('#totalProducts').textContent = inventory.length.toLocaleString('en-US');
  $('#totalUnits').textContent = inventory.reduce((n,item) => n + item.quantity,0).toLocaleString('en-US');
  $('#totalValue').textContent = dollars(inventory.reduce((n,item) => n + item.price*item.quantity,0));
  const items = filteredItems();
  $('#visibleCount').textContent = items.length;
  const target = $('#results');
  if (!items.length) {
    const nothingYet = inventory.length === 0;
    target.innerHTML = `<div class="empty-state"><div class="empty-icon">✦</div><h3>${nothingYet ? 'Tu colección comienza aquí' : 'No hay resultados'}</h3><p>${nothingYet ? 'Añade tu primer gel y empieza a organizar tu colección por marca, color y tipo.' : 'Prueba con otro código, color, marca o elimina algunos filtros.'}</p>${nothingYet ? '<button class="primary-button" type="button" data-action="add">+ Añadir mi primer gel</button>' : '<button class="secondary-button" type="button" data-action="reset">Limpiar filtros</button>'}</div>`;
    return;
  }
  const groupKey = $('#groupSelect').value;
  if (groupKey === 'none') {
    target.innerHTML = `<div class="product-grid">${items.map(productCard).join('')}</div>`;
    return;
  }
  const groups = new Map();
  items.forEach(item => {
    const value = item[groupKey] || 'Sin categoría';
    const key = norm(value);
    if (!groups.has(key)) groups.set(key, {name:value,items:[]});
    groups.get(key).items.push(item);
  });
  const sortedGroups = [...groups.values()].sort((a,b) => a.name.localeCompare(b.name,'es',{numeric:true,sensitivity:'base'}));
  target.innerHTML = sortedGroups.map(group => `<section class="group-section"><div class="category-heading"><h3>${escapeHtml(group.name)} <span class="group-count">${group.items.length}</span></h3><span class="category-caption">${group.items.reduce((sum,item) => sum + item.quantity,0)} unidades</span></div><div class="product-grid">${group.items.map(productCard).join('')}</div></section>`).join('');
}

function refresh() { refreshFilters(); render(); }

function openEditor(item = null, duplicate = false) {
  activeMenu = null;
  render();
  $('#gelForm').reset();
  $('#formError').hidden = true;
  $('#editId').value = item && !duplicate ? item.id : '';
  $('#dialogTitle').textContent = item && !duplicate ? 'Editar gel' : duplicate ? 'Duplicar gel' : 'Añadir gel';
  $('#saveBtn').textContent = item && !duplicate ? 'Guardar cambios' : 'Guardar gel';
  $('#quantityInput').value = item ? String(item.quantity) : '1';
  $('#swatchInput').value = item ? validHex(item.swatch) : '#dca9b8';
  if (item) {
    $('#brandInput').value = item.brand;
    $('#codeInput').value = duplicate ? `${item.code}-COPIA` : item.code;
    $('#colorInput').value = item.color;
    $('#typeInput').value = item.type;
    $('#priceInput').value = item.price.toFixed(2);
    $('#notesInput').value = item.notes;
  }
  $('#gelDialog').showModal();
}

function handleSave(event) {
  event.preventDefault();
  const error = $('#formError');
  const previousId = $('#editId').value;
  const original = inventory.find(item => item.id === previousId);
  const item = sanitizeItem({
    id: previousId || makeId(),
    brand: $('#brandInput').value,
    code: $('#codeInput').value,
    color: $('#colorInput').value,
    type: $('#typeInput').value,
    price: $('#priceInput').value,
    quantity: $('#quantityInput').value,
    swatch: $('#swatchInput').value,
    notes: $('#notesInput').value,
    createdAt: original?.createdAt ?? Date.now()
  });
  if (!item || !$('#priceInput').value.trim() || !$('#quantityInput').value.trim()) {
    error.textContent = 'Completa todos los campos obligatorios.'; error.hidden = false; return;
  }
  if (inventory.some(other => other.id !== item.id && norm(other.brand) === norm(item.brand) && norm(other.code) === norm(item.code))) {
    error.textContent = 'Ya tienes un gel con ese código y esa marca. Edita ese registro o usa otro código.'; error.hidden = false; return;
  }
  const before = [...inventory];
  if (original) inventory = inventory.map(existing => existing.id === item.id ? item : existing);
  else inventory.push(item);
  if (!saveStore()) { inventory = before; return; }
  $('#gelDialog').close();
  refresh();
  showToast(original ? 'Gel actualizado' : 'Gel añadido a tu inventario');
}

function deleteItem(id) {
  const item = inventory.find(entry => entry.id === id);
  if (!item || !confirm(`¿Eliminar ${item.brand} ${item.code} (${item.color}) del inventario?`)) return;
  const before = inventory;
  inventory = inventory.filter(entry => entry.id !== id);
  if (!saveStore()) { inventory = before; return; }
  activeMenu = null;
  refresh(); showToast('Gel eliminado');
}

function clearFilters() {
  $('#searchInput').value = '';
  $('#typeFilter').value = '';
  $('#brandFilter').value = '';
  $('#colorFilter').value = '';
  render();
}

function download(name, mime, content) {
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function dateLabel() { return new Date().toISOString().slice(0,10); }

function exportJson() {
  download(`gel-studio-respaldo-${dateLabel()}.json`,'application/json;charset=utf-8',JSON.stringify({app:'gel-studio',version:1,exportedAt:new Date().toISOString(),items:inventory},null,2));
  showToast('Respaldo preparado para descargar');
}

function csvSafe(value) {
  let v = String(value ?? '');
  // Prevent spreadsheet formula injection in Excel and Google Sheets.
  if (/^[\s]*[=+@-]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g,'""')}"`;
}

function exportCsv() {
  const header = ['Marca','Código','Color','Tipo de gel','Precio USD','Cantidad','Valor USD','Color HEX','Notas'];
  const lines = [header.map(csvSafe).join(','),...inventory.map(item => [item.brand,item.code,item.color,item.type,item.price.toFixed(2),item.quantity,(item.price*item.quantity).toFixed(2),item.swatch,item.notes].map(csvSafe).join(','))];
  download(`gel-studio-inventario-${dateLabel()}.csv`,'text/csv;charset=utf-8','\ufeff'+lines.join('\r\n'));
  showToast('Tabla preparada para descargar');
}

async function importJson(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 15*1024*1024) throw Error('El archivo supera 15 MB.');
    const data = JSON.parse(await file.text());
    const rawItems = Array.isArray(data) ? data : data?.items;
    if (!Array.isArray(rawItems)) throw Error('El archivo no contiene un inventario válido.');
    if (rawItems.length > 20000) throw Error('El respaldo contiene demasiados registros.');
    const entries = rawItems.map(sanitizeItem);
    if (entries.some(item => !item)) throw Error('Algunos registros no tienen marca, código, color o tipo.');
    const seen = new Set();
    entries.forEach(item => {
      const key = norm(item.brand)+'\u0000'+norm(item.code);
      if (seen.has(key)) throw Error('Hay códigos duplicados para una misma marca.');
      seen.add(key);
    });
    if (!confirm(`Este respaldo tiene ${entries.length} geles. Reemplazará tus ${inventory.length} registros actuales. ¿Continuar?`)) return;
    const previous = inventory;
    inventory = entries.map(item => ({...item,id:makeId()}));
    if (!saveStore()) { inventory = previous; return; }
    clearFilters(); refresh();
    $('#dataDialog').close();
    showToast(`${entries.length} geles importados correctamente`);
  } catch (error) {
    alert(`No se pudo importar el respaldo: ${error.message}`);
  }
}

function deleteAll() {
  if (!inventory.length) { showToast('El inventario ya está vacío'); return; }
  if (!confirm('¿Borrar TODOS los geles de este dispositivo? Esta acción no se puede deshacer. Exporta un respaldo primero.')) return;
  const second = prompt('Para confirmar, escribe BORRAR en mayúsculas:');
  if (second !== 'BORRAR') { showToast('Operación cancelada'); return; }
  const previous = inventory;
  inventory = [];
  if (!saveStore()) { inventory = previous; return; }
  activeMenu = null;
  clearFilters(); refresh();
  $('#dataDialog').close(); showToast('Inventario borrado');
}

function init() {
  inventory = readStore();
  refresh();
  $('#addBtn').addEventListener('click',() => openEditor());
  $('#floatingAddBtn').addEventListener('click',() => openEditor());
  $('#backupBtn').addEventListener('click',() => $('#dataDialog').showModal());
  $('#gelForm').addEventListener('submit',handleSave);
  $('#clearFiltersBtn').addEventListener('click',clearFilters);
  $('#searchInput').addEventListener('input',render);
  ['#sortSelect','#typeFilter','#brandFilter','#colorFilter','#groupSelect'].forEach(selector => $(selector).addEventListener('change',render));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => $('#'+button.dataset.close).close()));
  $('#results').addEventListener('click',event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const {action,id} = button.dataset;
    if (action === 'add') return openEditor();
    if (action === 'reset') return clearFilters();
    if (action === 'menu') { activeMenu = activeMenu === id ? null : id; return render(); }
    const item = inventory.find(entry => entry.id === id);
    if (!item) return;
    if (action === 'edit') openEditor(item);
    if (action === 'duplicate') openEditor(item,true);
    if (action === 'delete') deleteItem(id);
  });
  document.addEventListener('click',event => {
    if (activeMenu && !event.target.closest('.card-menu') && !event.target.closest('.menu-pop')) { activeMenu = null; render(); }
  });
  $('#exportJsonBtn').addEventListener('click',exportJson);
  $('#exportCsvBtn').addEventListener('click',exportCsv);
  $('#importJsonBtn').addEventListener('click',() => $('#importFile').click());
  $('#importFile').addEventListener('change',importJson);
  $('#deleteAllBtn').addEventListener('click',deleteAll);
  ['#gelDialog','#dataDialog'].forEach(selector => {
    const dlg = $(selector);
    dlg.addEventListener('click', event => { if (event.target === dlg) dlg.close(); });
  });
  if ('serviceWorker' in navigator && ['https:','http:'].includes(location.protocol)) {
    window.addEventListener('load',() => navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Sin modo offline:',error)));
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
else init();
