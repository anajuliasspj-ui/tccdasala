// Importa o componente Stack do expo-router.
// Stack é um tipo de navegação "em pilha": cada tela nova é colocada
// em cima da anterior, e ao voltar a tela de cima é removida
// (é o mesmo efeito do router.push e do botão "voltar").
import { Stack } from 'expo-router';

// Este arquivo é o LAYOUT RAIZ do app (normalmente app/_layout.js).
// No expo-router, o _layout envolve todas as telas da pasta "app".
// Ele roda antes de qualquer tela e define como a navegação funciona.
export default function Layout() {
  return (
    // Stack gerencia a navegação entre as telas (login, tabela, editar, contas, cadastro...).
    // Cada arquivo dentro da pasta "app" vira uma tela automaticamente.
    <Stack
      // screenOptions são opções aplicadas a TODAS as telas do Stack
      screenOptions={{
        // headerShown: false esconde o cabeçalho padrão (barra no topo com o título
        // e a seta de voltar). Isso é necessário no seu projeto porque cada tela
        // já tem sua própria navbar azul feita à mão.
        headerShown: false,
      }}
    />
  );
}
