let filtroAtual = "all";
let filtroCorAtual = "all";

async function carregarDados() {
	const grid = document.getElementById("grid");
	const status = document.getElementById("status");

	try {
		const resposta = await fetch("dadosLovelyFriends.json");
		const data = await resposta.json();

		const missingPens = JSON.parse(localStorage.getItem("missingLovelyFriendsPens")) || [];
		grid.innerHTML = "";
		status.style.display = "none";
        window.onscroll = function() {
            const btn = document.getElementById("backToTop");
            
            const hasManyPens = typeof data !== 'undefined' && data.length > 20;

            if (hasManyPens && (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300)) {
                btn.style.display = "flex";
            } else {
                btn.style.display = "none";
            }
        };

		data.forEach((item) => {
			const isMissing = missingPens.includes(item.numero);
			const eLimitada =
				item.edicao_limitada === true || item.edicao_limitada === "true";
			const listaCores = item.cores
				? item.cores.split(",")
				: [item.cores || "#ccc"];
			const eDescontinuado =
				item.descontinuado === true || item.descontinuado === "true";
			const numToShow = item.display_num || item.numero;
			const eStarPen = item.numero.endsWith("star");

			const card = document.createElement("div");
            card.setAttribute('data-cores', item.cores);
           
			card.className = `card ${eLimitada ? "limitada" : ""} ${eStarPen ? 'star-pen-active' : ''} ${isMissing ? "missing" : ""} ${eDescontinuado ? "descontinuado" : ""}`;
			card.style.borderBottomColor = "var(--" + listaCores[0].trim() + ")";

			let coresHTML = '<div class="cores-container">';

			card.innerHTML = `
                    ${eDescontinuado ? '<span class="badge-descontinuado">🚫 Discontinued</span>' : ""}
                    ${eStarPen ? `<svg class="star-icon" viewBox="0 0 24 24" width="24" height="24">
    <path fill=${"var(--" + listaCores[0].trim() + ")"} d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
</svg>` : ''}
                    
                <div class="image-container">
                    <img src="${item.imagem}" alt="${item.nome}" onerror="this.src='https://fav.farm/🖊️'">
                </div>
                <div class="info">
                    ${eLimitada ? '<span class="badge-limitada">ED. LIMITADA</span>' : ""}
                    <p class="ano-lancamento">${item.ano}</p>
                    <p class="mensagem">${item.mensagem}</p>
                    <p class="nome">${item.nome}</p>
                    <span class="numero">Nº ${numToShow}</span>
                    ${coresHTML}
                    <div class="check-container" onclick="toggleMissing('${item.numero}')">
                    <input type="checkbox" ${isMissing ? "checked" : ""}> Missing?
                    </div>
                </div>
            `;
			grid.appendChild(card);
		});

		filtrarVisualmente();
	} catch (e) {
		status.innerText = "Erro ao carregar dados.";
	}
}


document.getElementById("backToTop").onclick = function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

function toggleMissing(id) {
	let missingPens = JSON.parse(localStorage.getItem("missingLovelyFriendsPens")) || [];
	if (missingPens.includes(id)) {
		missingPens = missingPens.filter((i) => i !== id);
	} else {
		missingPens.push(id);
	}
	localStorage.setItem("missingLovelyFriendsPens", JSON.stringify(missingPens));
	carregarDados();
}

function setFiltroCor(cor) {
    filtroCorAtual = cor;
    
    document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
    event.target.classList.add('active');
    
    filtrarVisualmente();
}

function filtrarCanetas() {
	const termo = document.getElementById("inputPesquisa").value.toLowerCase();
	const cartoes = document.querySelectorAll(".card");

	cartoes.forEach((card) => {
		const nome = card.querySelector(".nome").innerText.toLowerCase();
		const numero = card.querySelector(".numero").innerText.toLowerCase();

		if (nome.includes(termo) || numero.includes(termo)) {
			card.style.display = "flex";
		} else {
			card.style.display = "none";
		}
	});
}
function setFiltro(tipo, btn) {
	filtroAtual = tipo;

	document
		.querySelectorAll(".btn-filter")
		.forEach((b) => b.classList.remove("active"));
	btn.classList.add("active");

	const cartoes = document.querySelectorAll(".card");
	cartoes.forEach((card) => {
		const isMissing = card.classList.contains("missing");
		if (tipo === "all") card.style.display = "flex";
		else if (tipo === "missing" && isMissing) card.style.display = "flex";
		else card.style.display = "none";
	});
}
function filtrarVisualmente() {
	const termo = document.getElementById("inputPesquisa").value.toLowerCase();
	const cartoes = document.querySelectorAll(".card");

    

	cartoes.forEach((card) => {
		const nome = card.querySelector(".nome").innerText.toLowerCase();
		const numero = card.querySelector(".numero").innerText.toLowerCase();
		const isMissing = card.classList.contains("missing");
const corDaCaneta = card.getAttribute('data-cores');

		const batePesquisa = nome.includes(termo) || numero.includes(termo);
		const bateFiltroStatus = (filtroAtual === 'all') || (filtroAtual === 'missing' && isMissing);

        let bateCor = (filtroCorAtual === 'all') || (corDaCaneta === filtroCorAtual);

      

        if (batePesquisa && bateFiltroStatus && bateCor) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
	});
}

window.onload = carregarDados;
