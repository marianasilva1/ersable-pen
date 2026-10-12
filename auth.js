// Login e sincronização da lista "Owned" (canetas que cada pessoa já tem) com o Firebase.
// Sem login qualquer pessoa vê a coleção, mas só quem entra na conta pode marcar
// canetas. A lista fica guardada na conta (Firestore, documento users/{uid}) e em
// cache no localStorage, que é o que o script.js lê para desenhar os cartões.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
	getAuth,
	onAuthStateChanged,
	GoogleAuthProvider,
	signInWithPopup,
	sendSignInLinkToEmail,
	isSignInWithEmailLink,
	signInWithEmailLink,
	signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
	getFirestore,
	doc,
	getDoc,
	setDoc,
	arrayUnion,
	arrayRemove,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Firebase → Definições do projeto → As tuas apps → firebaseConfig.
// Estes valores não são secretos: foram feitos para estar no código do site.
// Enquanto apiKey não estiver preenchido, o login fica desligado e o site funciona
// como antes (lista guardada só no browser).
const firebaseConfig = {
	apiKey: "AIzaSyBO3voGQme8Q6DRL6tbgcT5APDT5D3zymY",
	authDomain: "stationary-lover.firebaseapp.com",
	projectId: "stationary-lover",
	storageBucket: "stationary-lover.firebasestorage.app",
	messagingSenderId: "419482932555",
	appId: "1:419482932555:web:c2d9367b5cf34f9d8604ce",
};

const CHAVE_EMAIL = "emailParaLogin";

function lerLocal(chave) {
	try {
		return JSON.parse(localStorage.getItem(chave)) || [];
	} catch {
		return [];
	}
}

function chavesLocais() {
	try {
		return Object.keys(localStorage).filter((k) => k.startsWith("owned"));
	} catch {
		return [];
	}
}

function redesenhar() {
	if (typeof window.carregarDados === "function" && document.getElementById("grid")) {
		window.carregarDados();
	}
}

// O "Owned" dos cartões e os filtros All/Owned/Missing estão escondidos por CSS até esta classe
// aparecer no <body>: com login ativo só quando alguém entra na conta, sem login
// configurado logo à partida (comportamento antigo).
if (!firebaseConfig.apiKey) document.body.classList.add("com-login");

if (firebaseConfig.apiKey) {
	const app = initializeApp(firebaseConfig);
	const auth = getAuth(app);
	const db = getFirestore(app);

	const Conta = {
		utilizador: null,
		abrirLogin,
		async guardar(chave, id, marcado) {
			if (!Conta.utilizador) return;
			try {
				await setDoc(
					doc(db, "users", Conta.utilizador.uid),
					{ [chave]: marcado ? arrayUnion(id) : arrayRemove(id) },
					{ merge: true },
				);
			} catch (e) {
				console.error(e);
				alert("Couldn't save your change. Please check your connection and try again.");
			}
		},
	};
	window.Conta = Conta;

	// Junta a lista da conta com o que já estava marcado neste browser (de antes
	// de haver login), para ninguém perder o que tinha.
	async function sincronizar(user) {
		const ref = doc(db, "users", user.uid);
		const snap = await getDoc(ref);
		const remoto = snap.exists() ? snap.data() : {};
		const chaves = new Set([
			...Object.keys(remoto).filter((k) => k.startsWith("owned")),
			...chavesLocais(),
		]);
		const novos = {};
		chaves.forEach((chave) => {
			const naConta = Array.isArray(remoto[chave]) ? remoto[chave] : [];
			const soNoBrowser = lerLocal(chave).filter((id) => !naConta.includes(id));
			localStorage.setItem(chave, JSON.stringify([...naConta, ...soNoBrowser]));
			if (soNoBrowser.length) novos[chave] = arrayUnion(...soNoBrowser);
		});
		if (Object.keys(novos).length) await setDoc(ref, novos, { merge: true });
	}

	// Ao sair, a lista deixa de aparecer neste browser (útil em computadores partilhados).
	function limparLocal() {
		chavesLocais().forEach((k) => localStorage.removeItem(k));
	}

	// --- Interface: botão no cabeçalho + janela de login ---

	const botaoConta = document.createElement("button");
	botaoConta.className = "btn-conta";
	document.querySelector(".main-header")?.appendChild(botaoConta);

	const dialog = document.createElement("dialog");
	dialog.className = "dialog-login";
	dialog.innerHTML = `
		<button class="dialog-fechar" aria-label="Close">×</button>
		<h2>Sign in to track your collection</h2>
		<p>Tick the pens you own and find your collection on any device.</p>
		<button class="btn-google"><i class="fab fa-google"></i> Continue with Google</button>
		<div class="dialog-ou">or</div>
		<form class="form-email">
			<input type="email" required placeholder="your@email.com" aria-label="Email" />
			<button type="submit">Email me a sign-in link</button>
		</form>
		<p class="dialog-msg" aria-live="polite"></p>
	`;
	document.body.appendChild(dialog);
	const msg = dialog.querySelector(".dialog-msg");

	// Convite para entrar, no lugar dos filtros "All / Owned / Missing" (só aparece sem login).
	const filtros = document.querySelector(".filter-options");
	if (filtros) {
		const dica = document.createElement("button");
		dica.className = "dica-login";
		dica.innerHTML = '<i class="fas fa-lock"></i> Sign in to track your collection';
		dica.onclick = () => abrirLogin();
		filtros.after(dica);
	}

	function abrirLogin() {
		msg.textContent = "";
		dialog.showModal();
	}

	dialog.querySelector(".dialog-fechar").onclick = () => dialog.close();
	dialog.addEventListener("click", (e) => {
		if (e.target === dialog) dialog.close(); // clique fora da janela
	});

	dialog.querySelector(".btn-google").onclick = async () => {
		try {
			await signInWithPopup(auth, new GoogleAuthProvider());
			dialog.close();
		} catch (e) {
			if (e.code !== "auth/popup-closed-by-user") {
				console.error(e);
				msg.textContent = "Couldn't sign in with Google. Please try again.";
			}
		}
	};

	dialog.querySelector(".form-email").onsubmit = async (e) => {
		e.preventDefault();
		const email = e.target.querySelector("input").value.trim();
		try {
			await sendSignInLinkToEmail(auth, email, {
				url: location.origin + location.pathname,
				handleCodeInApp: true,
			});
			localStorage.setItem(CHAVE_EMAIL, email);
			msg.textContent = "Check your inbox! We sent you a link to sign in.";
		} catch (err) {
			console.error(err);
			msg.textContent = "Couldn't send the link. Please check the email and try again.";
		}
	};

	botaoConta.onclick = async () => {
		if (!Conta.utilizador) return abrirLogin();
		if (confirm("Sign out?")) await signOut(auth);
	};

	// Voltar do link enviado por email.
	if (isSignInWithEmailLink(auth, location.href)) {
		const email =
			localStorage.getItem(CHAVE_EMAIL) || prompt("Please confirm your email to finish signing in:");
		if (email) {
			signInWithEmailLink(auth, email, location.href)
				.then(() => localStorage.removeItem(CHAVE_EMAIL))
				.catch((e) => {
					console.error(e);
					alert("This sign-in link has expired or was already used. Please request a new one.");
				})
				.finally(() => history.replaceState(null, "", location.pathname));
		}
	}

	onAuthStateChanged(auth, async (user) => {
		const saiu = Conta.utilizador && !user;
		Conta.utilizador = user;
		document.body.classList.toggle("com-login", !!user);
		// Ao sair, volta ao filtro "All" (os filtros deixam de estar visíveis).
		if (saiu) document.querySelector(".btn-filter")?.click();

		if (user) {
			const nome = user.displayName || user.email || "My account";
			botaoConta.textContent = "";
			botaoConta.title = "Signed in as " + nome + " (click to sign out)";
			const icone = document.createElement("i");
			icone.className = "fas fa-user-circle";
			botaoConta.append(icone, " " + nome.split(/[ @]/)[0]);
			try {
				await sincronizar(user);
			} catch (e) {
				console.error(e);
			}
		} else {
			botaoConta.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign in';
			botaoConta.title = "Sign in to track your collection";
			if (saiu) limparLocal();
		}
		redesenhar();
	});
}
