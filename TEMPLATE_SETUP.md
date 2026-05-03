# Ativando o Template ERP (Guia Rápido)

Este projeto foi configurado como um **Template Universal**. Siga os passos abaixo toda vez que precisar ativar este sistema para uma nova conta Firebase.

## 1. Criar o Projeto Firebase
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Crie um novo projeto.
3. Ative os serviços:
   - **Authentication** (Provedor Google)
   - **Firestore Database**
   - **Storage** (Para logos e anexos)

## 2. Configurar o Ambiente Local
Renomeie o arquivo de exemplo para `.env.local`:
```bash
cp .env.example .env.local
```
Abra o `.env.local` e cole as chaves que o Firebase gerar nas configurações do projeto da web (`projectId`, `apiKey`, etc.).

## 3. Conectar a CLI do Firebase
No terminal, faça login na sua conta Google e conecte o repositório ao projeto criado:

```bash
firebase login
firebase use --add
```
> Selecione o projeto recém-criado na lista e dê a ele o apelido de `default`.

## 4. Deploy de Regras e Serviços
Agora que o projeto está conectado, suba as regras do Firestore e do Storage (se houver):
```bash
firebase deploy --only firestore:rules
```

## 5. Rodar o Sistema
Por fim, rode o servidor de desenvolvimento para testar o ERP no seu novo banco de dados.
```bash
npm install
npm run dev
```

Pronto! Seu novo cliente já está no ar com um banco de dados totalmente limpo e isolado.
