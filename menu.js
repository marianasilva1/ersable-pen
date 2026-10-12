// Menu "hamburger" para ecrãs pequenos: abre e fecha a navegação do cabeçalho.
// A animação (barras → X e links a deslizar) está toda no style.css (.menu-aberto).
const botaoMenu = document.querySelector(".menu-toggle");
const cabecalho = document.querySelector(".main-header");

if (botaoMenu && cabecalho) {
	function definirMenu(aberto) {
		cabecalho.classList.toggle("menu-aberto", aberto);
		botaoMenu.setAttribute("aria-expanded", String(aberto));
		botaoMenu.setAttribute("aria-label", aberto ? "Close menu" : "Open menu");
	}

	botaoMenu.addEventListener("click", () => {
		definirMenu(!cabecalho.classList.contains("menu-aberto"));
	});

	// Fecha com Escape, ao clicar fora do cabeçalho ou ao escolher uma página.
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") definirMenu(false);
	});
	document.addEventListener("click", (e) => {
		if (!cabecalho.contains(e.target)) definirMenu(false);
	});
	cabecalho.querySelectorAll(".nav-links a").forEach((link) => {
		link.addEventListener("click", () => definirMenu(false));
	});
}
