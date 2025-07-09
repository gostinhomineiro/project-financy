let clientsData = [];
let verificationInProgress = false;

// Drag and drop functionality
const uploadSection = document.getElementById('uploadSection');

uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('dragover');
});

uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('dragover');
});

uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

document.getElementById('fileInput').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.name.endsWith('.xlsx')) {
        alert('Por favor, selecione apenas arquivos Excel (.xlsx)');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length > 10000) {
                alert('A planilha excede o limite de 10.000 registros. Por favor, reduza o número de linhas.');
                return;
            }

            processData(jsonData);
        } catch (error) {
            alert('Erro ao processar o arquivo. Verifique se é um arquivo Excel válido.');
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
}

function processData(data) {
    clientsData = data.map((row, index) => {
        const phoneFields = ['telefone', 'phone', 'celular', 'whatsapp', 'numero', 'fone'];
        let phone = '';

        for (const field of phoneFields) {
            const key = Object.keys(row).find(k => k.toLowerCase().includes(field.toLowerCase()));
            if (key && row[key]) {
                phone = String(row[key]).replace(/\D/g, '');
                break;
            }
        }

        const nameFields = ['nome', 'name', 'cliente', 'razao', 'empresa'];
        let name = '';
        for (const field of nameFields) {
            const key = Object.keys(row).find(k => k.toLowerCase().includes(field.toLowerCase()));
            if (key && row[key]) {
                name = row[key];
                break;
            }
        }

        return {
            id: index + 1,
            name: name || `Cliente ${index + 1}`,
            phone: formatPhone(phone),
            originalPhone: phone,
            status: 'pending',
            otherData: Object.keys(row).map(key => `${key}: ${row[key]}`).join(', '),
            rawData: row
        };
    });

    displayData();
    updateStats();
    showSections();
}

function formatPhone(phone) {
    if (!phone) return '';
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 13 && numbers.startsWith('55')) {
        return `+${numbers.slice(0,2)} (${numbers.slice(2,4)}) ${numbers.slice(4,5)} ${numbers.slice(5,9)}-${numbers.slice(9)}`;
    } else if (numbers.length === 11) {
        return `+55 (${numbers.slice(0,2)}) ${numbers.slice(2,3)} ${numbers.slice(3,7)}-${numbers.slice(7)}`;
    } else if (numbers.length === 10) {
        return `+55 (${numbers.slice(0,2)}) ${numbers.slice(2,6)}-${numbers.slice(6)}`;
    }
    return phone;
}

function isValidBrazilianPhone(phone) {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length !== 13 && numbers.length !== 11 && numbers.length !== 10) return false;
    const ddd = numbers.length === 13 ? numbers.slice(2,4) : numbers.slice(0,2);
    const dddNum = parseInt(ddd);
    return dddNum >= 11 && dddNum <= 99;
}

function displayData() {
    const tbody = document.getElementById('clientsTable');
    tbody.innerHTML = '';

    clientsData.forEach(client => {
        const row = document.createElement('tr');

        const statusClass = client.status === 'verified' ? 'status-verified' :
                            client.status === 'not-verified' ? 'status-not-verified' : 'status-pending';

        const statusText = client.status === 'verified' ? '✅ Tem WhatsApp' :
                            client.status === 'not-verified' ? '❌ Não tem WhatsApp' : '⏳ Pendente';

        row.innerHTML = `
            <td>${client.id}</td>
            <td>${client.name}</td>
            <td class="phone-input">${client.phone}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${client.otherData}</td>
        `;

        tbody.appendChild(row);
    });
}

function updateStats() {
    const total = clientsData.length;
    const withWhatsApp = clientsData.filter(c => c.status === 'verified').length;
    const withoutWhatsApp = clientsData.filter(c => c.status === 'not-verified').length;
    const pending = clientsData.filter(c => c.status === 'pending').length;

    document.getElementById('totalClients').textContent = total;
    document.getElementById('withWhatsApp').textContent = withWhatsApp;
    document.getElementById('withoutWhatsApp').textContent = withoutWhatsApp;
    document.getElementById('pendingVerification').textContent = pending;
}

function showSections() {
    document.getElementById('statsGrid').classList.remove('hidden');
    document.getElementById('actionsSection').classList.remove('hidden');
    document.getElementById('tableContainer').classList.remove('hidden');
}

async function verificarNumeroComAPI(numero) {
    try {
        const response = await fetch('/analise', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ number: numero })
        });

        const result = await response.json();
        return result.success;
    } catch (err) {
        console.error('Erro na verificação via API:', err);
        return false;
    }
}

async function startVerification() {
    if (verificationInProgress) return;

    verificationInProgress = true;
    document.getElementById('verifyBtn').disabled = true;
    document.getElementById('progressSection').classList.remove('hidden');

    const totalClients = clientsData.length;
    let verifiedCount = 0;

    for (let i = 0; i < clientsData.length; i++) {
        const client = clientsData[i];

        if (isValidBrazilianPhone(client.originalPhone)) {
            const temWhatsApp = await verificarNumeroComAPI(client.originalPhone);
            client.status = temWhatsApp ? 'verified' : 'not-verified';
        } else {
            client.status = 'not-verified';
        }

        verifiedCount++;
        const progress = (verifiedCount / totalClients) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${verifiedCount}/${totalClients}`;

        if (verifiedCount % 10 === 0 || verifiedCount === totalClients) {
            displayData();
            updateStats();
        }
    }

    verificationInProgress = false;
    document.getElementById('verifyBtn').disabled = false;
    document.getElementById('progressSection').classList.add('hidden');
    document.getElementById('exportWithBtn').disabled = false;
    document.getElementById('exportWithoutBtn').disabled = false;

    displayData();
    updateStats();
    alert('✅ Verificação concluída!');
}

function exportData(type) {
    let filteredData;
    let filename;

    if (type === 'with') {
        filteredData = clientsData.filter(c => c.status === 'verified');
        filename = 'clientes_com_whatsapp.xlsx';
    } else {
        filteredData = clientsData.filter(c => c.status === 'not-verified');
        filename = 'clientes_sem_whatsapp.xlsx';
    }

    if (filteredData.length === 0) {
        alert(`Nenhum cliente encontrado para exportar na categoria "${type === 'with' ? 'com' : 'sem'} WhatsApp".`);
        return;
    }

    const exportData = filteredData.map(client => ({
        Nome: client.name,
        Telefone: client.phone,
        'Status WhatsApp': client.status === 'verified' ? 'Tem WhatsApp' : 'Não tem WhatsApp',
        ...client.rawData
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, filename);
    alert(`✅ Arquivo "${filename}" baixado com sucesso! (${filteredData.length} registros)`);
}
