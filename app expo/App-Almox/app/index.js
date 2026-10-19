// Importa o componente Redirect do expo-router.
// Redirect leva o usuário automaticamente para outra tela assim que é renderizado,
// sem precisar de clique ou de chamar router.push/router.replace.
import { Redirect } from 'expo-router';

// Este arquivo é a tela inicial do app (app/index.js).
// No expo-router, o arquivo "index" corresponde à rota raiz '/',
// ou seja, é a primeira tela que abre quando o app é iniciado.
export default function Index() {
  return (
    // Em vez de mostrar conteúdo, esta tela só redireciona para '/login'.
    // O resultado é que o app sempre começa na tela de login.
    // O Redirect funciona como o router.replace: a tela index sai da pilha,
    // então o usuário não consegue voltar para ela com o botão "voltar".
    <Redirect href="/login" />
  );
}
