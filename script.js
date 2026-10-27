const CONFIG = window.PAGE_CONFIG || { dataUrl: "dados.json", storageKey: "ownedPens" };

// As imagens do catálogo Legami partilham quase todo o URL — nos JSON só
// guardamos a parte que muda ("dwHASH/CODIGO_N.jpg") e remontamos aqui.
const LEGAMI_IMG_BASE =
	"https://www.legami.com/dw/image/v2/BDSQ_PRD/on/demandware.static/-/Sites-legami-master-catalog/default/";
const LEGAMI_IMG_MID = "images_legami/zoom/";
const LEGAMI_IMG_SUFFIX = "?sw=1200&sh=1200";

// Links de afiliado. Enquanto os IDs estiverem vazios não aparece nenhum botão.
//
// Awin (programa "Legami IT"): quando fores aprovada, põe aqui o teu ID de publisher
// e o ID do anunciante (merchant ID) que aparecem no painel da Awin. Cada caneta à
// venda passa a ter um botão para a loja Legami, através do teu link Awin:
//  - "Buy on Legami" abre a página do produto (legami.com/it-it/V<código>.html);
//  - "Shop on Legami" abre a página das canetas apagáveis, para as canetas marcadas
//    no JSON com "naLoja": false (não têm página própria na loja Legami IT).
// As descontinuadas não têm botão (a Legami já não as vende).
//
// Amazon: quando fores aprovada no Amazon Associados, põe aqui o teu ID (ex.: "legamipens-21").
// Só é usada nas canetas em que a Awin não se aplica.
//
// Para uma caneta específica, podes pôr um link direto no JSON: "comprar": "https://..."
// (esse link tem prioridade sobre tudo o resto).
const AFILIADOS = {
	awinPublisherId: "",
	awinMerchantId: "",
	legamiLoja: "https://www.legami.com/it-it",
	legamiCategoria: "/cartoleria/scrittura/penne-cancellabili.html",
	// Páginas com categoria própria na loja Legami
	legamiCategoriaPorPagina: {
		"dadosLovelyFriends.json": "/cartoleria/scrittura/penne-lovely-friends.html",
	},
	amazonDominio: "amazon.es",
	amazonTag: "",
};

// Código Legami do produto: "EP0001_star" → "EP0001" (os sufixos são variantes nossas).
function codigoLegami(item) {
	return String(item.display_num || item.numero).split("_")[0];
}

// Destino na loja Legami: a página do produto, ou a categoria quando não existe.
function destinoLegami(item) {
	const codigo = codigoLegami(item);
	if (item.naLoja !== false && /^[A-Z]+\d+$/.test(codigo)) {
		const ref = codigo.startsWith("V") ? codigo : "V" + codigo;
		return { url: `${AFILIADOS.legamiLoja}/${ref}.html`, texto: "Buy on Legami" };
	}
	const categoria = AFILIADOS.legamiCategoriaPorPagina[CONFIG.dataUrl] || AFILIADOS.legamiCategoria;
	return { url: AFILIADOS.legamiLoja + categoria, texto: "Shop on Legami" };
}

// Devolve { url, texto } para o botão de compra, ou null se não houver link.
function linkCompra(item) {
	if (item.comprar) return { url: item.comprar, texto: "Where to buy" };

	const eDescontinuado = item.descontinuado === true || item.descontinuado === "true";
	if (AFILIADOS.awinPublisherId && AFILIADOS.awinMerchantId && !eDescontinuado) {
		const destino = destinoLegami(item);
		return {
			url: `https://www.awin1.com/cread.php?awinmid=${encodeURIComponent(AFILIADOS.awinMerchantId)}&awinaffid=${encodeURIComponent(AFILIADOS.awinPublisherId)}&ued=${encodeURIComponent(destino.url)}`,
			texto: destino.texto,
		};
	}

	if (AFILIADOS.amazonTag) {
		const termo = ["Legami erasable pen", item.nome || item.display_num || item.numero]
			.filter(Boolean)
			.join(" ");
		return {
			url: `https://www.${AFILIADOS.amazonDominio}/s?k=${encodeURIComponent(termo)}&tag=${encodeURIComponent(AFILIADOS.amazonTag)}`,
			texto: "Where to buy",
		};
	}
	return null;
}

// Aviso obrigatório pelos programas de afiliados — só aparece se houver links ativos.
function mostrarAvisoAfiliados() {
	const rodape = document.querySelector(".creditos");
	if (!rodape || rodape.querySelector(".aviso-afiliados")) return;
	const aviso = document.createElement("p");
	aviso.className = "aviso-afiliados";
	aviso.textContent =
		"Some links are affiliate links: if you buy through them I may earn a small commission, at no extra cost to you.";
	rodape.appendChild(aviso);
}

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

		const ownedPens = JSON.parse(localStorage.getItem(CONFIG.storageKey)) || [];
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

		data.forEach((item) => grid.appendChild(criarCard(item, ownedPens)));
		atualizarProgresso(data, ownedPens);

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

function criarCard(item, ownedPens) {
	const showColors = CONFIG.showColors !== false;
	const isOwned = ownedPens.includes(item.numero);
	const eLimitada = item.edicao_limitada === true || item.edicao_limitada === "true";
	const listaCores = (item.cores ? item.cores.split(",") : [])
		.map((c) => c.trim())
		.filter(corValida);
	const eDescontinuado = item.descontinuado === true || item.descontinuado === "true";
	const numToShow = item.display_num || item.numero;
	const eStarPen = typeof item.numero === "string" && item.numero.endsWith("star");
	const imagens = (Array.isArray(item.imagem) ? item.imagem : [item.imagem]).map(resolveImagem);
	const compra = linkCompra(item);
	if (compra) mostrarAvisoAfiliados();

	const card = document.createElement("div");
	card.setAttribute("data-cores", item.cores);
	card.className = `card ${eLimitada ? "limitada" : ""} ${eStarPen ? "star-pen-active" : ""} ${isOwned ? "owned" : ""} ${eDescontinuado ? "descontinuado" : ""}`;
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
                    ${eDescontinuado ? '<span class="badge-descontinuado">Discontinued</span>' : ""}
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
                    ${eLimitada ? '<span class="badge-limitada">Limited edition</span>' : ""}
                    ${item.ano ? `<p class="ano-lancamento">${item.ano}</p>` : ""}
                    ${item.mensagem ? `<p class="mensagem">${item.mensagem}</p>` : ""}
                    ${item.nome ? `<p class="nome">${item.nome}</p>` : ""}
                    <span class="numero">Nº ${numToShow}</span>
                    ${coresHTML}
                    ${compra ? `<a class="btn-comprar" href="${compra.url}" target="_blank" rel="sponsored noopener">${compra.texto}</a>` : ""}
                    <div class="check-container" onclick="toggleOwned('${item.numero}')">
                    <input type="checkbox" ${isOwned ? "checked" : ""}> Owned
                    </div>
                </div>
            `;
	return card;
}

// Contador "You own X of Y" com barra de progresso, por cima dos filtros.
// Só fica visível com sessão iniciada (ver body.com-login em style.css).
function atualizarProgresso(data, ownedPens) {
	const filtros = document.querySelector(".filter-options");
	if (!filtros) return;

	let caixa = document.getElementById("progresso");
	if (!caixa) {
		caixa = document.createElement("div");
		caixa.id = "progresso";
		caixa.className = "progresso";
		caixa.innerHTML = `
			<p class="progresso-texto"></p>
			<div class="progresso-barra" role="progressbar" aria-valuemin="0">
				<div class="progresso-preenchido"></div>
			</div>
		`;
		filtros.before(caixa);
	}

	const total = data.length;
	const tenho = data.filter((item) => ownedPens.includes(item.numero)).length;
	const pct = total ? Math.round((tenho / total) * 100) : 0;
	const texto = caixa.querySelector(".progresso-texto");
	const barra = caixa.querySelector(".progresso-barra");

	// Sem nada marcado ainda, explica primeiro o que fazer em vez de mostrar 0%.
	caixa.classList.toggle("sem-marcacoes", tenho === 0);
	if (tenho === 0) {
		texto.textContent = "Tick the pens you own to see your progress ✨";
	} else {
		texto.innerHTML = `You own <strong>${tenho}</strong> of ${total} <span class="progresso-pct">${pct}%</span>`;
	}
	barra.setAttribute("aria-valuemax", total);
	barra.setAttribute("aria-valuenow", tenho);
	barra.setAttribute("aria-label", `You own ${tenho} of ${total}`);
	caixa.querySelector(".progresso-preenchido").style.width = pct + "%";
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

function toggleOwned(id) {
	// Com o login ativo (auth.js), só quem entrou na conta pode marcar canetas.
	const conta = window.Conta;
	if (conta && !conta.utilizador) {
		conta.abrirLogin();
		carregarDados(); // desfaz o visto que o clique pôs na caixa
		return;
	}

	let ownedPens = JSON.parse(localStorage.getItem(CONFIG.storageKey)) || [];
	const marcado = !ownedPens.includes(id);
	if (marcado) {
		ownedPens.push(id);
	} else {
		ownedPens = ownedPens.filter((i) => i !== id);
	}
	localStorage.setItem(CONFIG.storageKey, JSON.stringify(ownedPens));
	if (conta) conta.guardar(CONFIG.storageKey, id, marcado);
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
		const isOwned = card.classList.contains("owned");
		const corDaCaneta = card.getAttribute("data-cores");

		const batePesquisa = nome.includes(termo) || numero.includes(termo);
		// "Missing" = tudo o que não está marcado como Owned.
		const bateFiltroStatus =
			filtroAtual === "all" ||
			(filtroAtual === "owned" && isOwned) ||
			(filtroAtual === "missing" && !isOwned);
		const bateCor = filtroCorAtual === "all" || corDaCaneta === filtroCorAtual;

		card.style.display = batePesquisa && bateFiltroStatus && bateCor ? "flex" : "none";
	});
}

window.onload = carregarDados;
