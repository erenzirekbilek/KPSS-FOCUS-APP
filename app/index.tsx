import { Redirect } from "expo-router";

export default function Index() {
  // Bu dosya artık görsel bir şey barındırmaz,
  // uygulama açılır açılmaz kullanıcıyı direkt welcome ekranına fırlatır.
  return <Redirect href="/welcome" />;
}
