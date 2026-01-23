let filtroAtual = 'all';

async function carregarDados() {
    const grid = document.getElementById('grid');
    const status = document.getElementById('status');

    try {
        const resposta = await fetch('dadosPack.json');
        const data = await resposta.json();
        
        const missingPens = JSON.parse(localStorage.getItem('missingPens')) || [];
        grid.innerHTML = '';
        status.style.display = 'none';

        data.forEach(item => {
            const isMissing = missingPens.includes(item.numero);
            const eLimitada = item.edicao_limitada === true || item.edicao_limitada === "true";
             const listaCores = item.cores ? item.cores.split(',') : [item.cores || '#ccc'];
const imagens = Array.isArray(item.imagem) ? item.imagem : [item.imagem];
let imgAtual = 0;
            const card = document.createElement('div');
            card.className = `card ${eLimitada ? 'limitada' : ''} ${isMissing ? 'missing' : ''}`;
            
             
                      let coresHTML = '<div class="cores-container">';
            listaCores.length >1 && listaCores.forEach(c => coresHTML += `<div class="bola-cor" style="background-color: var(--${c.trim()}) "></div>`);
            coresHTML += '</div>';

            card.innerHTML = `
                <div class="image-container">
        ${imagens.length > 1 ? `
            <button class="btn-nav btn-prev" onclick="event.stopPropagation(); mudarFoto(this, -1)">❮</button>
            <button class="btn-nav btn-next" onclick="event.stopPropagation(); mudarFoto(this, 1)">❯</button>
        ` : ''}
        <img src="${imagens[0]}" class="img-principal" alt="${item.nome}" 
             data-fotos='${JSON.stringify(imagens)}' data-index="0">
    </div>
                <div class="info">
                    ${eLimitada ? '<span class="badge-limitada">ED. LIMITADA</span>' : ''}
                    <p class="ano-lancamento">${item.ano}</p>
                    <span class="numero">Nº ${item.numero}</span>
                    ${coresHTML}
                    <div class="check-container" onclick="toggleMissing('${item.numero}')">
                    <input type="checkbox" ${isMissing ? 'checked' : ''}> Missing?
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
        
        filtrarVisualmente(); // Reaplica filtros se houver pesquisa ativa
    } catch (e) {
        status.innerText = "Erro ao carregar dados.";
    }
}
function mudarFoto(botao, direcao) {
    const container = botao.parentElement;
    const img = container.querySelector('.img-principal');
    const fotos = JSON.parse(img.getAttribute('data-fotos'));
    let index = parseInt(img.getAttribute('data-index'));

    index += direcao;

    // Loop infinito: se chegar ao fim volta ao início e vice-versa
    if (index >= fotos.length) index = 0;
    if (index < 0) index = fotos.length - 1;

    img.src = fotos[index];
    img.setAttribute('data-index', index);
}

function toggleMissing(id) {
    let missingPens = JSON.parse(localStorage.getItem('missingPens')) || [];
    if (missingPens.includes(id)) {
        missingPens = missingPens.filter(i => i !== id);
    } else {
        missingPens.push(id);
    }
    localStorage.setItem('missingPens', JSON.stringify(missingPens));
    carregarDados();
}

function filtrarCanetas() {
    // 1. Pega o texto escrito e transforma em minúsculas
    const termo = document.getElementById('inputPesquisa').value.toLowerCase();
    
    // 2. Pega todos os cartões da grid
    const cartoes = document.querySelectorAll('.card');

    cartoes.forEach(card => {
        // 3. Procura o texto dentro do nome e do número
        const nome = card.querySelector('.nome').innerText.toLowerCase();
        const numero = card.querySelector('.numero').innerText.toLowerCase();

        // 4. Se o termo estiver no nome ou no número, mostra. Se não, esconde.
        if (nome.includes(termo) || numero.includes(termo)) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}
function setFiltro(tipo, btn) {
    filtroAtual = tipo;
    
    // Atualiza estética dos botões
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Aplica o filtro visual
    const cartoes = document.querySelectorAll('.card');
    cartoes.forEach(card => {
        const isMissing = card.classList.contains('missing');
        if (tipo === 'all') card.style.display = 'flex';
        else if (tipo === 'missing' && isMissing) card.style.display = 'flex';
        else card.style.display = 'none';
    });
}
function filtrarVisualmente() {
    const termo = document.getElementById('inputPesquisa').value.toLowerCase();
    const cartoes = document.querySelectorAll('.card');

    cartoes.forEach(card => {
        const nome = card.querySelector('.nome').innerText.toLowerCase();
        const numero = card.querySelector('.numero').innerText.toLowerCase();
        const isMissing = card.classList.contains('missing');

        const batePesquisa = nome.includes(termo) || numero.includes(termo);
        const bateFiltro = (filtroAtual === 'all') || (filtroAtual === 'missing' && isMissing);

        card.style.display = (batePesquisa && bateFiltro) ? "flex" : "none";
    });
}

window.onload = carregarDados;
