// --- BANCO DE DADOS LOCAL (SIMULADO NO LOCALSTORAGE) ---
let registeredUsers = JSON.parse(localStorage.getItem('saneweb_users')) || [
    { username: "admin", password: "12345" }
];

let chatMessages = JSON.parse(localStorage.getItem('saneweb_chat')) || [
    { sender: "Carlos", text: "Alguém mais notou interrupção no abastecimento de água na zona norte?", city: "São Paulo - SP" },
    { sender: "Ana", text: "Aqui a água voltou ao normal há poucas horas.", city: "São Paulo - SP" }
];

let suggestions = JSON.parse(localStorage.getItem('saneweb_suggestions')) || [
    { title: "Coleta Seletiva", text: "Poderíamos ter pontos de entrega voluntária de óleo de cozinha usado nas escolas.", sender: "admin" },
    { title: "Conscientização", text: "Criar uma cartilha digital sobre reciclagem de resíduos sólidos.", sender: "admin" }
];

let currentUser = "";
let currentCity = "";
let allLoadedCities = [];

// Executa assim que a página carrega os elementos estruturais
document.addEventListener("DOMContentLoaded", () => {
    loadStates();
});

// Busca estados brasileiros na API oficial do IBGE
async function loadStates() {
    const stateSelect = document.getElementById("login-uf");
    try {
        const response = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?some=nome&ordem=NOME");
        const states = await response.json();
        
        states.forEach(state => {
            const option = document.createElement("option");
            option.value = state.sigla;
            option.textContent = `${state.nome} - ${state.sigla}`;
            stateSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar estados:", error);
    }
}

// Busca as cidades correspondentes ao estado selecionado via API do IBGE
async function loadCities(uf) {
    const citySelect = document.getElementById("login-city");
    const searchInput = document.getElementById("search-city-input");
    
    citySelect.innerHTML = '<option value="">-- Carregando municípios... --</option>';
    citySelect.disabled = true;
    searchInput.disabled = true;
    searchInput.value = "";

    if (!uf) {
        citySelect.innerHTML = '<option value="">-- Selecione primeiro o Estado --</option>';
        return;
    }

    try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?ordem=NOME`);
        allLoadedCities = await response.json();
        
        renderCityOptions(allLoadedCities, uf);
        
        citySelect.disabled = false;
        searchInput.disabled = false;
    } catch (error) {
        console.error("Erro ao carregar cidades:", error);
        citySelect.innerHTML = '<option value="">Erro ao carregar municípios</option>';
    }
}

// Renderiza a lista de opções de cidade no elemento select
function renderCityOptions(citiesList, uf) {
    const citySelect = document.getElementById("login-city");
    citySelect.innerHTML = '<option value="">-- Escolha uma cidade --</option>';
    
    citiesList.forEach(city => {
        const option = document.createElement("option");
        const cityValue = `${city.nome} - ${uf}`;
        option.value = cityValue;
        option.textContent = cityValue;
        citySelect.appendChild(option);
    });
}

// Filtra as cidades na memória conforme digitação do usuário (ignora acentos)
function filterCities() {
    const query = document.getElementById("search-city-input").value.toLowerCase().trim();
    const currentUf = document.getElementById("login-uf").value;
    
    const filtered = allLoadedCities.filter(city => 
        city.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    );
    
    renderCityOptions(filtered, currentUf);
}

// Gerenciamento de Telas
function showRegisterScreen() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('register-screen').classList.remove('hidden');
}

function showLoginScreen() {
    document.getElementById('register-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
}

// Ação de Registro
function handleRegister() {
    const user = document.getElementById('reg-user').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!user || !password) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }
    if (password.length < 5) {
        alert("A senha precisa conter ao menos 5 caracteres.");
        return;
    }

    if (registeredUsers.some(u => u.username.toLowerCase() === user.toLowerCase())) {
        alert("Nome de usuário indisponível.");
        return;
    }

    registeredUsers.push({ username: user, password: password });
    localStorage.setItem('saneweb_users', JSON.stringify(registeredUsers));

    alert("Cadastro realizado com sucesso!");
    showLoginScreen();
    
    document.getElementById('reg-user').value = "";
    document.getElementById('reg-password').value = "";
}

// Ação de Login
function handleLogin() {
    const citySelect = document.getElementById('login-city');
    const userInput = document.getElementById('login-user').value.trim();
    const passwordInput = document.getElementById('login-password').value;

    if (!citySelect.value) {
        alert("Por favor, selecione sua localização.");
        return;
    }

    const userFound = registeredUsers.find(u => u.username === userInput && u.password === passwordInput);

    if (userFound) {
        currentUser = userFound.username;
        currentCity = citySelect.value;
        
        document.getElementById('user-display-info').innerText = `👤 ${currentUser} (${currentCity})`;
        document.getElementById('chat-city-title').innerText = currentCity;
        
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        loadChat();
        loadSuggestions();
    } else {
        alert("Credenciais incorretas.");
    }
}

// Ação de Logout
function handleLogout() {
    currentUser = "";
    currentCity = "";
    
    document.getElementById('login-user').value = "";
    document.getElementById('login-password').value = "";
    document.getElementById('login-city').value = "";
    document.getElementById('login-uf').value = "";
    document.getElementById('search-city-input').value = "";
    document.getElementById('search-city-input').disabled = true;
    document.getElementById('login-city').disabled = true;
    document.getElementById('login-city').innerHTML = '<option value="">-- Selecione primeiro o Estado --</option>';
    
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
}

// Carrega as mensagens de chat filtradas pela cidade
function loadChat() {
    const chatBox = document.getElementById('chat-messages');
    chatBox.innerHTML = "";

    const cityMessages = chatMessages.filter(m => m.city === currentCity);

    cityMessages.forEach(msg => {
        const newMessage = document.createElement('div');
        
        if (msg.sender === currentUser) {
            newMessage.className = "message sent";
            newMessage.innerHTML = `<strong>Você:</strong> ${msg.text}`;
        } else {
            newMessage.className = "message received";
            newMessage.innerHTML = `<strong>${msg.sender}:</strong> ${msg.text}`;
        }
        chatBox.appendChild(newMessage);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Envia mensagem no Fórum
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (input.value.trim() === "") return;

    chatMessages.push({
        sender: currentUser,
        text: input.value.trim(),
        city: currentCity
    });

    localStorage.setItem('saneweb_chat', JSON.stringify(chatMessages));
    input.value = "";
    loadChat();
}

// Carrega propostas ambientais enviadas
function loadSuggestions() {
    const list = document.getElementById('suggestions-list');
    list.innerHTML = "";
    
    [...suggestions].reverse().forEach(sug => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>[${sug.title}]</strong> ${sug.text} <span style="font-size:11px; color:#546e7a;">(por ${sug.sender})</span>`;
        list.appendChild(li);
    });
}

// Envia uma nova Eco-Sugestão
function submitSuggestion() {
    const title = document.getElementById('sug-title').value.trim();
    const text = document.getElementById('sug-text').value.trim();

    if (!title || !text) {
        alert("Preencha todos os campos da proposta.");
        return;
    }

    suggestions.push({
        title: title,
        text: text,
        sender: currentUser
    });

    localStorage.setItem('saneweb_suggestions', JSON.stringify(suggestions));

    document.getElementById('sug-title').value = "";
    document.getElementById('sug-text').value = "";
    
    loadSuggestions();
}

// Sistema de Alternância de Abas (Navegação interna)
function switchTab(tabId, buttonElement) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.add('hidden'));

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.remove('hidden');
    buttonElement.classList.add('active');
}

// Envia relatório técnico ao especialista em saneamento
function submitToProfessional() {
    const desc = document.getElementById('prob-desc').value.trim();
    if (desc === "") {
        alert("Descreva detalhadamente o evento técnico.");
        return;
    }
    
    const responseBox = document.getElementById('professional-response');
    responseBox.style.display = "block";
    responseBox.innerHTML = "<strong>🧪 Análise da Engenharia:</strong> Ocorrência mapeada com sucesso para a localidade de " + currentCity + ". Nossos engenheiros sanitaristas revisarão os parâmetros estruturais descritos e as diretrizes ambientais aplicáveis serão atualizadas em seu painel em breve.";
    document.getElementById('prob-desc').value = "";
}