// Ativação e inicialização do ecossistema de dados locais
let cart = JSON.parse(localStorage.getItem('fitlife_cart')) || [];
let orders = JSON.parse(localStorage.getItem('fitlife_orders')) || [];
let cancelledOrders = JSON.parse(localStorage.getItem('fitlife_cancelled')) || [];

// Objeto de controle temporário para montagem customizada
let selectedCustom = {
    protein: '',
    carbo: '',
    acomp: ''
};

// Variável global para controle do modal nativo de cancelamentos
let currentCancelOrderId = null;

// Escuta de carregamento do DOM
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initFilters();
    updateCartUI();
    renderOrders();
    renderCancelledOrders();
    generateHTML();
});

// Sistema de Alerta e Notificações (Toasts)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-circle-exclamation';
    if (type === 'info') icon = 'fa-circle-info';
    
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Controle de Roteamento de Abas Principais
function initNavigation() {
    document.querySelectorAll("nav button").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");
            document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
            
            const targetSection = document.getElementById(target);
            if (targetSection) targetSection.classList.add("active");
        });
    });
}

// Filtros do Cardápio Principal
function initFilters() {
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active-filter"));
            btn.classList.add("active-filter");
            
            const filter = btn.getAttribute("data-filter");
            document.querySelectorAll("#menu .card").forEach(card => {
                const cats = card.getAttribute("data-category") || "";
                if (filter === "all" || cats.includes(filter)) {
                    card.style.display = "block";
                } else {
                    card.style.display = "none";
                }
            });
        });
    });
}

// Lógica Geral do Carrinho de Compras
function addToCart(name, price) {
    const found = cart.find(item => item.name === name);
    if (found) {
        found.qty++;
    } else {
        cart.push({ name, price, qty: 1 });
    }
    saveCart();
    updateCartUI();
    showToast(`"${name}" adicionado ao seu carrinho com sucesso!`);
}

function updateCartQty(name, amount) {
    const found = cart.find(item => item.name === name);
    if (found) {
        found.qty += amount;
        if (found.qty <= 0) {
            cart = cart.filter(item => item.name !== name);
        }
        saveCart();
        updateCartUI();
    }
}

function removeFromCart(name) {
    cart = cart.filter(item => item.name !== name);
    saveCart();
    updateCartUI();
    showToast('Item removido do carrinho.', 'info');
}

function saveCart() {
    localStorage.setItem('fitlife_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const list = document.getElementById('cartList');
    const totalDisplay = document.getElementById('cartTotalContainer');
    const checkoutTotal = document.getElementById('checkoutTotalValue');
    
    if (!list) return;
    list.innerHTML = '';
    
    let total = 0;
    
    // Sincroniza e redesenha a lista do carrinho
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="cart-item-info">
                <strong>${item.name}</strong> - R$ ${item.price.toFixed(2)}
            </div>
            <div style="display:flex; align-items:center; gap:15px;">
                <div class="qty-controls">
                    <button onclick="updateCartQty('${item.name}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="updateCartQty('${item.name}', 1)">+</button>
                </div>
                <span style="font-weight:600; min-width:70px; text-align:right;">R$ ${itemTotal.toFixed(2)}</span>
                <button class="remove-btn" onclick="removeFromCart('${item.name}')"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        list.appendChild(li);
    });
    
    if (cart.length === 0) {
        list.innerHTML = '<p style="color:#666; padding:15px;">O seu carrinho está vazio no momento.</p>';
    }
    
    if (totalDisplay) totalDisplay.innerText = `Total do Carrinho: R$ ${total.toFixed(2)}`;
    if (checkoutTotal) checkoutTotal.innerText = `R$ ${total.toFixed(2)}`;
    
    // Atualiza dinamicamente as linhas de ação do cardápio padrão
    document.querySelectorAll('.price-row').forEach(row => {
        const prodName = row.getAttribute('data-product');
        const foundItem = cart.find(i => i.name === prodName);
        const priceValue = parseFloat(row.querySelector('.price').innerText.replace('R$', '').replace(',', '.').trim());
        
        if (foundItem) {
            row.innerHTML = `
                <div class="price">R$ ${priceValue.toFixed(2)}</div>
                <div class="qty-controls">
                    <button onclick="updateCartQty('${prodName}', -1)">-</button>
                    <span>${foundItem.qty}</span>
                    <button onclick="updateCartQty('${prodName}', 1)">+</button>
                </div>
            `;
        } else {
            row.innerHTML = `
                <div class="price">R$ ${priceValue.toFixed(2)}</div>
                <button class="action" onclick="addToCart('${prodName}', ${priceValue})"><i class="fa-solid fa-cart-plus"></i> Adicionar</button>
            `;
        }
    });
}

// Lógica de Montagem de Marmita Customizada (Chef Express)
function selectCustomIngredient(category, name, element) {
    // Remove seleção visual prévia do mesmo grupo
    const parent = element.parentElement;
    parent.querySelectorAll('.custom-card-option').forEach(opt => opt.classList.remove('selected'));
    
    // Aplica nova seleção
    element.classList.add('selected');
    selectedCustom[category] = name;
    
    // Atualiza banner de resumo em tempo real
    const summary = document.getElementById('custom-summary-details');
    if (summary) {
        const p = selectedCustom.protein || '...';
        const c = selectedCustom.carbo || '...';
        const a = selectedCustom.acomp || '...';
        summary.innerHTML = `<strong>${p}</strong> + <strong>${c}</strong> + <strong>${a}</strong>`;
    }
}

function addCustomMealToCart() {
    if (!selectedCustom.protein || !selectedCustom.carbo || !selectedCustom.acomp) {
        showToast('Escolha um ingrediente de cada um dos 3 passos para montar a sua marmita!', 'warning');
        return;
    }
    
    const fullName = `Marmita Customizada (${selectedCustom.protein} / ${selectedCustom.carbo} / ${selectedCustom.acomp})`;
    addToCart(fullName, 26.00);
    
    // Reseta as seleções visuais e o estado
    selectedCustom = { protein: '', carbo: '', acomp: '' };
    document.querySelectorAll('.custom-card-option').forEach(opt => opt.classList.remove('selected'));
    const summary = document.getElementById('custom-summary-details');
    if (summary) summary.innerText = 'Selecione os itens acima...';
}

// Controle de exibição do troco no Checkout
function toggleChangeField() {
    const method = document.getElementById('payment-method').value;
    const wrapper = document.getElementById('change-wrapper');
    if (wrapper) wrapper.style.display = (method === 'dinheiro') ? 'block' : 'none';
}

// Fechamento e processamento de envio via WhatsApp
function placeOrder() {
    if (cart.length === 0) {
        showToast('O seu carrinho está vazio! Adicione itens antes de tentar finalizar.', 'warning');
        return;
    }
    
    const name = document.getElementById('name').value.trim();
    const cep = document.getElementById('cep').value.trim();
    const address = document.getElementById('address').value.trim();
    const complement = document.getElementById('complement').value.trim();
    const payment = document.getElementById('payment-method').value;
    const change = document.getElementById('cash-change').value.trim();
    
    if (!name || !cep || !address) {
        showToast('Por favor, preencha todos os campos obrigatórios de endereço!', 'warning');
        return;
    }
    
    let total = 0;
    let textItems = '';
    cart.forEach(item => {
        const sub = item.price * item.qty;
        total += sub;
        textItems += `- ${item.qty}x ${item.name} (R$ ${sub.toFixed(2)})\n`;
    });
    
    let textPayment = `Forma de Pagamento: ${payment.toUpperCase()}`;
    if (payment === 'dinheiro' && change) {
        textPayment += ` (Levar troco para R$ ${change})`;
    }
    
    const orderId = '#' + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
        id: orderId,
        date: new Date().toLocaleString('pt-BR'),
        items: [...cart],
        total: total,
        status: 'Pendente'
    };
    
    orders.push(newOrder);
    localStorage.setItem('fitlife_orders', JSON.stringify(orders));
    
    // Constrói mensagem codificada para o WhatsApp
    const msg = `*Novo Pedido FitLife - ${orderId}*\n\n` +
                `*Cliente:* ${name}\n` +
                `*CEP:* ${cep}\n` +
                `*Endereço:* ${address}\n` +
                (complement ? `*Complemento:* ${complement}\n` : '') +
                `\n*Itens do Pedido:*\n${textItems}\n` +
                `*Total:* R$ ${total.toFixed(2)}\n` +
                `*${textPayment}*`;
                
    const whatsappUrl = `https://api.whatsapp.com/send?phone=5500000000000&text=${encodeURIComponent(msg)}`;
    
    // Reseta carrinho local e limpa campos do formulário
    cart = [];
    saveCart();
    updateCartUI();
    document.getElementById('name').value = '';
    document.getElementById('cep').value = '';
    document.getElementById('address').value = '';
    document.getElementById('complement').value = '';
    if(document.getElementById('cash-change')) document.getElementById('cash-change').value = '';
    
    renderOrders();
    window.open(whatsappUrl, '_blank');
    showToast('Pedido registrado! Redirecionando para o WhatsApp...');
}

// Histórico de Pedidos e Solicitações de Cancelamento
function renderOrders() {
    const container = document.getElementById('orderList');
    if (!container) return;
    container.innerHTML = '';
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="color:#666; padding:15px;">Nenhum pedido em andamento.</p>';
        return;
    }
    
    orders.forEach(order => {
        const li = document.createElement('li');
        li.style.flexDirection = 'column';
        li.style.alignItems = 'stretch';
        li.style.gap = '10px';
        
        let itemsStr = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');
        
        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>Pedido ${order.id}</strong> <span style="font-size:12px; color:#666;">(${order.date})</span>
                </div>
                <span class="tag" style="margin-bottom:0; background:#e2e8f0; color:#333;">${order.status}</span>
            </div>
            <div style="font-size:14px; color:#444;">${itemsStr}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                <span style="font-weight:600; color:#14331f;">Total: R$ ${order.total.toFixed(2)}</span>
                <button class="cancel-order-btn" onclick="openCancelModal('${order.id}')">
                    <i class="fa-solid fa-ban"></i> Solicitar Cancelamento
                </button>
            </div>
        `;
        container.appendChild(li);
    });
}

function openCancelModal(orderId) {
    currentCancelOrderId = orderId;
    const modal = document.getElementById('cancelModal');
    if (modal) modal.classList.add('show');
}

function closeCancelModal() {
    currentCancelOrderId = null;
    const modal = document.getElementById('cancelModal');
    if (modal) modal.classList.remove('show');
    document.getElementById('modalReasonInput').value = '';
}

function confirmModalCancellation() {
    const reason = document.getElementById('modalReasonInput').value.trim();
    if (!reason) {
        showToast('Por favor, descreva explicitamente o motivo do cancelamento!', 'warning');
        return;
    }
    
    const orderIndex = orders.findIndex(o => o.id === currentCancelOrderId);
    if (orderIndex !== -1) {
        const targetedOrder = orders[orderIndex];
        targetedOrder.status = 'Cancelamento Solicitado';
        targetedOrder.cancelReason = reason;
        targetedOrder.cancelDate = new Date().toLocaleString('pt-BR');
        
        // Move do array ativo para o array de cancelados
        cancelledOrders.push(targetedOrder);
        orders.splice(orderIndex, 1);
        
        localStorage.setItem('fitlife_orders', JSON.stringify(orders));
        localStorage.setItem('fitlife_cancelled', JSON.stringify(cancelledOrders));
        
        renderOrders();
        renderCancelledOrders();
        closeCancelModal();
        showToast('Solicitação de cancelamento enviada com sucesso para análise!');
        generateHTML();
    }
}

function renderCancelledOrders() {
    const container = document.getElementById('cancelledOrderList');
    if (!container) return;
    container.innerHTML = '';
    
    if (cancelledOrders.length === 0) {
        container.innerHTML = '<p style="color:#666; padding:15px;">Nenhuma solicitação de cancelamento efetuada.</p>';
        return;
    }
    
    cancelledOrders.forEach(order => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cancelled-item';
        
        let itemsStr = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');
        
        itemDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>Pedido ${order.id}</strong>
                <span class="tag" style="background:#fed7d7; color:#9b2c2c; margin-bottom:0;">${order.status}</span>
            </div>
            <div class="cancelled-text">
                <strong>Itens:</strong> ${itemsStr}<br>
                <strong>Total do Pedido:</strong> R$ ${order.total.toFixed(2)}<br>
                <strong>Solicitado em:</strong> ${order.cancelDate}
            </div>
            <div>
                <label style="font-size:13px; font-weight:600; color:#c53030;">Motivo do Cancelamento:</label>
                <textarea class="cancelled-textarea" readonly>${order.cancelReason}</textarea>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

// Operações da Aba do Administrador
function switchAdminTab(tabId, element) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active-admin-tab'));
    
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active-admin-tab');
}

function updateHeroSettings() {
    const title = document.getElementById('adminHeroTitle').value.trim();
    const desc = document.getElementById('adminHeroDesc').value.trim();
    const imgUrl = document.getElementById('adminHeroImg').value.trim();
    
    if (title) document.getElementById('hero-title').innerHTML = title;
    if (desc) document.getElementById('hero-description').innerText = desc;
    if (imgUrl) document.getElementById('hero-image').setAttribute('src', imgUrl);
    
    showToast('Configurações visuais do cabeçalho modificadas com sucesso!');
    generateHTML();
}

function handleAdminImageUpload(inputElement, targetInputId) {
    const file = inputElement.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(targetInputId).value = e.target.result;
            showToast('Upload local processado em string Base64 com sucesso! Clique em Salvar.');
        };
        reader.readAsDataURL(file);
    }
}

function injectCustomIngredient() {
    const ingName = document.getElementById('adminIngName').value.trim();
    let ingIcon = document.getElementById('adminIngIcon').value.trim();
    const groupTargetId = document.getElementById('adminIngGroup').value;
    
    if (ingName === '') {
        showToast('Informe o nome do ingrediente customizado!', 'warning');
        return;
    }
    
    if (ingIcon === '') {
        ingIcon = 'fa-solid fa-circle-nodes'; 
    }
    
    const groupContainer = document.getElementById(groupTargetId);
    if (groupContainer) {
        let catShortname = 'protein';
        if (groupTargetId === 'carbo-group') catShortname = 'carbo';
        if (groupTargetId === 'acomp-group') catShortname = 'acomp';
        
        const newOption = document.createElement('div');
        newOption.className = 'custom-card-option';
        newOption.setAttribute('onclick', `selectCustomIngredient('${catShortname}', '${ingName}', this)`);
        
        newOption.innerHTML = `
            <i class="${ingIcon}"></i>
            <span>${ingName}</span>
        `;
        
        groupContainer.appendChild(newOption);
        showToast(`Ingrediente "${ingName}" injetado com sucesso no Passo ${catShortname === 'protein' ? '1' : catShortname === 'carbo' ? '2' : '3'}!`);
        
        document.getElementById('adminIngName').value = '';
        document.getElementById('adminIngIcon').value = '';
        generateHTML();
    }
}

// Captura do DOM e Geração de Código Sincronizado para Exportação Permanentada
function generateHTML() {
    const htmlOutput = document.getElementById('htmlOutput');
    if (htmlOutput) {
        const html = document.documentElement.outerHTML;
        htmlOutput.value = html;
    }
}

