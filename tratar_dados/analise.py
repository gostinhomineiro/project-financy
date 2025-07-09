import pandas as pd
from datetime import datetime, timedelta

# Caminhos fixos
CAMINHO_PLANILHA_1 = 'clientes.xls'
CAMINHO_PLANILHA_2 = 'boletos.xls'

def ler_html_ou_xls(caminho):
    try:
        # Tenta ler como HTML disfarçado de xls
        tabelas = pd.read_html(caminho)
        return tabelas[0]
    except Exception as e:
        print(f'Erro ao ler {caminho} como HTML: {e}')
        return None

# Carregar planilhas
clientes = ler_html_ou_xls(CAMINHO_PLANILHA_1)
boletos = ler_html_ou_xls(CAMINHO_PLANILHA_2)

# Validar se as planilhas foram lidas corretamente
if clientes is None or boletos is None:
    print("Erro na leitura de uma das planilhas.")
    exit()

# Renomear colunas importantes da planilha de clientes (planilha 1)
# len() é como o length do JS e o range() faz parte do loop FOR - IN que mostras quantas vezes o loop vai se repetir

clientes.columns = [f"col_{i}" for i in range(len(clientes.columns))] 
clientes = clientes.rename(columns={
    "col_0": "codigo_cliente",
    "col_9": "WhatsApp"  # coluna 10 (base 0)
})


# Renomear colunas importantes da planilha de boletos (planilha 2)
boletos.columns = [f"col_{i}" for i in range(len(boletos.columns))]
boletos = boletos.rename(columns={
    "col_3": "codigo_cliente",
    "col_4": "nome_cliente",
    "col_9": "vencimento",
    "col_2": "numero_pedido",
    "col_11": "valor",
    "col_0": "link_pagamento"  # se aplicável, ou remova
})

# Tansforma o valor string em float e divide por 100  
boletos['valor'] = boletos['valor'].astype(float) / 100

# Converter datas corretamente
boletos['vencimento'] = pd.to_datetime(boletos['vencimento'], errors='coerce', dayfirst=True)


# Data atual
hoje = datetime.now().date()
hoje_plus_2 = hoje + timedelta(days=2)

# Filtro de cobrança (vencimento > hoje)
filtro_cobranca = boletos[boletos['vencimento'].dt.date > hoje]

# Filtro de lembrete (vencimento == hoje + 2 dias)
filtro_lembrete = boletos[boletos['vencimento'].dt.date == hoje_plus_2]

# Unir os dois
boletos_filtrados = pd.concat([filtro_cobranca, filtro_lembrete])

# Merge com os WhatsApps da planilha de clientes
resultado = pd.merge(boletos_filtrados, clientes[['codigo_cliente', 'WhatsApp']], on='codigo_cliente', how='left')


# Reorganizar colunas conforme saída esperada
saida = resultado[[
    'nome_cliente',
    'codigo_cliente',
    'valor',
    'vencimento',
    'WhatsApp',
    'link_pagamento',
    'numero_pedido',
    
]]



saida = saida[saida["WhatsApp"].notna() & (saida["WhatsApp"].str.strip() != "")]


# Formatar vencimento
saida['vencimento'] = saida['vencimento'].dt.strftime('%d/%m/%Y')

saida['WhatsApp'] = saida['WhatsApp'].str.replace("(1-COMERCIAL)", "", regex=False)

saida['WhatsApp'] = "55" + saida['WhatsApp'].str.replace("-", "", regex=False)

saida['link_pagamento'] = "http://"

# Exportar resultado
saida.to_excel("saida_cobrancas_lembretes.xlsx", index=False)

print("Planilha final gerada com sucesso: 'saida_cobrancas_lembretes.xlsx'")