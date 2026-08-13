const CONFIG = window.PAGE_CONFIG || { dataUrl: "dados.json", storageKey: "missingPens" };

// As imagens do catálogo Legami partilham quase todo o URL — nos JSON só
// guardamos a parte que muda ("dwHASH/CODIGO_N.jpg") e remontamos aqui.
const LEGAMI_IMG_BASE =
	"https://www.legami.com/dw/image/v2/BDSQ_PRD/on/demandware.static/-/Sites-legami-master-catalog/default/";
const LEGAMI_IMG_MID = "images_legami/zoom/";
const LEGAMI_IMG_SUFFIX = "?sw=1200&sh=1200";

function resolveImagem(caminho) {
	const m = /^(dw[0-9a-f]+)\/([A-Za-z0-9_]+\.jpg)$/.exec(caminho);
	if (m) {
		return LEGAMI_IMG_BASE + m[1] + "/" + LEGAMI_IMG_MID + m[2] + LEGAMI_IMG_SUFFIX;
	}
	return caminho; // já é um URL completo ou uma imagem local (placeholder)
}

let filtroAtual = "all";
let filtroCorAtual = "all";

async function carregarDados() {
	const grid = document.getElementById("grid");
	const status = document.getElementById("status");

	try {
		const resposta = await fetch(CONFIG.dataUrl);
		const data = await resposta.json();

		const missingPens = JSON.parse(localStorage.getItem(CONFIG.storageKey)) || [];
		grid.innerHTML = "";
		status.style.display = "none";

		const backToTopBtn = document.getElementById("backToTop");
		if (backToTopBtn) {
			window.onscroll = function () {
				const hasManyPens = data.length > 20;
				const scrolledPast300 =
					document.body.scrollTop > 300 || document.documentElement.scrollTop > 300;
				backToTopBtn.style.display = hasManyPens && scrolledPast300 ? "flex" : "none";
			};
		}

		data.forEach((item) => grid.appendChild(criarCard(item, missingPens)));

		filtrarVisualmente(); // Reaplica filtros ativos (pesquisa/estado/cor)
	} catch (e) {
		status.innerText = "Erro ao carregar dados.";
	}
}

// Cores conhecidas do tema (ver as variáveis --Black, --Green, etc. em style.css).
// Valores de "cores" que não batem aqui (ex.: "-" em entradas por preencher) são
// tratados como "sem cor" em vez de gerar um var(--...) inválido.
const CORES_CONHECIDAS = new Set([
	"Black",
	"Green",
	"Blue",
	"Pink",
	"Turquoise",
	"Red",
	"Orange",
	"Purple",
]);

function corValida(c) {
	return CORES_CONHECIDAS.has(c) || /^#[0-9a-fA-F]{3,8}$/.test(c);
}

function criarCard(item, missingPens) {
	const showColors = CONFIG.showColors !== false;
	const isMissing = missingPens.includes(item.numero);
	const eLimitada = item.edicao_limitada === true || item.edicao_limitada === "true";
	const listaCores = (item.cores ? item.cores.split(",") : [])
		.map((c) => c.trim())
		.filter(corValida);
	const eDescontinuado = item.descontinuado === true || item.descontinuado === "true";
	const numToShow = item.display_num || item.numero;
	const eStarPen = typeof item.numero === "string" && item.numero.endsWith("star");
	const imagens = (Array.isArray(item.imagem) ? item.imagem : [item.imagem]).map(resolveImagem);

	const card = document.createElement("div");
	card.setAttribute("data-cores", item.cores);
	card.className = `card ${eLimitada ? "limitada" : ""} ${eStarPen ? "star-pen-active" : ""} ${isMissing ? "missing" : ""} ${eDescontinuado ? "descontinuado" : ""}`;
	if (showColors && listaCores.length > 0) {
		const primeiraCor = listaCores[0];
		card.style.borderBottomColor = primeiraCor.startsWith("#") ? primeiraCor : "var(--" + primeiraCor + ")";
	}

	let coresHTML = "";
	if (showColors && listaCores.length > 1) {
		coresHTML = '<div class="cores-container">';
		listaCores.forEach((c) => {
			const valor = c.startsWith("#") ? c : "var(--" + c + ")";
			coresHTML += `<div class="bola-cor" style="background-color: ${valor}"></div>`;
		});
		coresHTML += "</div>";
	}

	const corPrincipal = listaCores.length > 0 ? listaCores[0] : "Black";
	const corPrincipalCSS = corPrincipal.startsWith("#") ? corPrincipal : "var(--" + corPrincipal + ")";

	card.innerHTML = `
                    ${eDescontinuado ? '<span class="badge-descontinuado">🚫 Discontinued</span>' : ""}
                    ${
											eStarPen
												? `<svg class="star-icon" viewBox="0 0 24 24" width="24" height="24">
    <path fill="${corPrincipalCSS}" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
</svg>`
												: ""
										}
                <div class="image-container">
                    ${
											imagens.length > 1
												? `<button class="btn-nav btn-prev" onclick="event.stopPropagation(); mudarFoto(this, -1)">❮</button>
                    <button class="btn-nav btn-next" onclick="event.stopPropagation(); mudarFoto(this, 1)">❯</button>`
												: ""
										}
                    <img src="${imagens[0]}" class="img-principal" alt="${item.nome || ""}" data-fotos='${JSON.stringify(imagens)}' data-index="0" onerror="this.src='https://fav.farm/🖊️'">
                </div>
                <div class="info">
                    ${eLimitada ? '<span class="badge-limitada">ED. LIMITADA</span>' : ""}
                    ${item.ano ? `<p class="ano-lancamento">${item.ano}</p>` : ""}
                    ${item.mensagem ? `<p class="mensagem">${item.mensagem}</p>` : ""}
                    ${item.nome ? `<p class="nome">${item.nome}</p>` : ""}
                    <span class="numero">Nº ${numToShow}</span>
                    ${coresHTML}
                    <div class="check-container" onclick="toggleMissing('${item.numero}')">
                    <input type="checkbox" ${isMissing ? "checked" : ""}> Missing?
                    </div>
                </div>
            `;
	return card;
}

function mudarFoto(botao, direcao) {
	const container = botao.parentElement;
	const img = container.querySelector(".img-principal");
	const fotos = JSON.parse(img.getAttribute("data-fotos"));
	let index = parseInt(img.getAttribute("data-index"));

	index += direcao;

	// Loop infinito: se chegar ao fim volta ao início e vice-versa
	if (index >= fotos.length) index = 0;
	if (index < 0) index = fotos.length - 1;

	img.src = fotos[index];
	img.setAttribute("data-index", index);
}

const backToTopBtn = document.getElementById("backToTop");
if (backToTopBtn) {
	backToTopBtn.onclick = function () {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	};
}

function toggleMissing(id) {
	let missingPens = JSON.parse(localStorage.getItem(CONFIG.storageKey)) || [];
	if (missingPens.includes(id)) {
		missingPens = missingPens.filter((i) => i !== id);
	} else {
		missingPens.push(id);
	}
	localStorage.setItem(CONFIG.storageKey, JSON.stringify(missingPens));
	carregarDados();
}

function setFiltroCor(cor, evt) {
	filtroCorAtual = cor;

	// Atualiza a bolinha ativa
	document.querySelectorAll(".dot").forEach((d) => {
		d.classList.remove("active");
		d.setAttribute("aria-pressed", "false");
	});
	evt.target.classList.add("active");
	evt.target.setAttribute("aria-pressed", "true");

	filtrarVisualmente();
}

// Torna as bolinhas de filtro de cor operáveis por teclado (Enter/Espaço),
// já que são <div>, não <button>.
document.querySelectorAll(".dot").forEach((dot) => {
	dot.addEventListener("keydown", (evt) => {
		if (evt.key === "Enter" || evt.key === " ") {
			evt.preventDefault();
			dot.click();
		}
	});
});

function filtrarCanetas() {
	filtrarVisualmente();
}

function setFiltro(tipo, btn) {
	filtroAtual = tipo;

	// Atualiza estética dos botões
	document
		.querySelectorAll(".btn-filter")
		.forEach((b) => b.classList.remove("active"));
	btn.classList.add("active");

	filtrarVisualmente();
}

function filtrarVisualmente() {
	const inputEl = document.getElementById("inputPesquisa");
	const termo = inputEl ? inputEl.value.toLowerCase() : "";
	const cartoes = document.querySelectorAll(".card");

	cartoes.forEach((card) => {
		const nomeEl = card.querySelector(".nome");
		const nome = nomeEl ? nomeEl.innerText.toLowerCase() : "";
		const numero = card.querySelector(".numero").innerText.toLowerCase();
		const isMissing = card.classList.contains("missing");
		const corDaCaneta = card.getAttribute("data-cores");

		const batePesquisa = nome.includes(termo) || numero.includes(termo);
		const bateFiltroStatus =
			filtroAtual === "all" || (filtroAtual === "missing" && isMissing);
		const bateCor = filtroCorAtual === "all" || corDaCaneta === filtroCorAtual;

		card.style.display = batePesquisa && bateFiltroStatus && bateCor ? "flex" : "none";
	});
}

window.onload = carregarDados;
