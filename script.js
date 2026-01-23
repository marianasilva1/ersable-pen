let filtroAtual = 'all';

async function carregarDados() {
    const grid = document.getElementById('grid');
    const status = document.getElementById('status');

    try {
        const resposta = await fetch('dados.json');
        const data = await resposta.json();
        
        const missingPens = JSON.parse(localStorage.getItem('missingPens')) || [];
        grid.innerHTML = '';
        status.style.display = 'none';

        data.forEach(item => {
            const isMissing = missingPens.includes(item.numero);
            const eLimitada = item.edicao_limitada === true || item.edicao_limitada === "true";
            const listaCores = item.cores ? item.cores.split(',') : [item.cores || '#ccc'];
const eDescontinuado = item.descontinuado === true || item.descontinuado === "true"; 

            const card = document.createElement('div');
            card.className = `card ${eLimitada ? 'limitada' : ''} ${isMissing ? 'missing' : ''} ${eDescontinuado ? 'descontinuado' : ''}`;
            card.style.borderBottomColor = 'var(--'+listaCores[0].trim()+')'
         

            let coresHTML = '<div class="cores-container">';
       

            card.innerHTML = `
            ${eDescontinuado ? '<span class="badge-descontinuado">🚫 Discontinued</span>' : ''}
                <div class="image-container">
                    <img src="${item.imagem}" alt="${item.nome}" onerror="this.src='https://fav.farm/🖊️'">
                </div>
                <div class="info">
                    ${eLimitada ? '<span class="badge-limitada">ED. LIMITADA</span>' : ''}
                    <p class="ano-lancamento">${item.ano}</p>
                    <p class="mensagem">${item.mensagem}</p>
                    <p class="nome">${item.nome}</p>
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
