# 🎯 KPSS Focus

<img src="./assets/images/project-images/icon-2.png" width="100" height="100" align="left" />

![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**KPSS Focus**, Kamu Personeli Seçme Sınavı'na hazırlanan adayların çalışma süreçlerini optimize etmeleri, süre takibi yapmaları ve gelişimlerini analiz etmeleri için tasarlanmış modern bir mobil asistan uygulamasıdır.  
*Hedefine odaklan, süreni yönet ve başarıya ulaş!*

---

## 📚 İçindekiler
- [✨ Özellikler](#-özellikler)
- [🛠 Kullanılan Teknolojiler](#-kullanılan-teknolojiler)
- [⚙️ Kurulum](#-kurulum)
- [🚀 Kullanım](#-kullanım)
- [📸 Proje Görselleri](#-proje-görselleri)
- [🎬 Proje Videosu](#-proje-videosu)
- [🤝 Katkıda Bulunma](#-katkıda-bulunma)
- [📄 Lisans](#-lisans)
- [📬 İletişim](#-iletişim)

---

## ✨ Özellikler
✅ **Pomodoro Sayacı:** 

- Sadece bir zamanlayıcı değil, KPSS adaylarının çalışma alışkanlıklarına göre optimize edilmiş bir verimlilik aracıdır.

- **Konu Bazlı Özelleştirme:** Her dersin zorluk seviyesi farklıdır. "Eğitim Bilimleri" için 25 dakikalık standart oturumlar ayarlayabilirken, yoğun "Genel Yetenek - Matematik" çözümleri için süreyi 50 dakikaya kadar esnetebilirsin.

- **Akıllı Mola Yönetimi:** Arka arkaya tamamlanan oturumlar sonrası sistem, zihinsel yorgunluğu önlemek için otomatik olarak "Uzun Mola" önerisinde bulunur.

- **Bütünleşik Takip:** Pomodoro oturumlarını doğrudan çalışma programınla ilişkilendirerek, hangi dersin başında kaç "pomodoro" (zaman dilimi) harcadığını istatistiksel olarak görebilirsin.

- Kesintisiz Odak Modu: Çalışma süresi boyunca dikkati dağıtacak bildirimleri minimize eden bir yapı ile sınav stresini yönetilebilir parçalara böler.

✅ **Konu Takip Sistemi:**

- **Ders ve Konu Hiyerarşisi:** Güncel ÖSYM müfredatına tam uyumlu; Genel Yetenek, Genel Kültür ve Eğitim Bilimleri derslerini alt konularına kadar detaylıca listeler.

- **Soru Sayacı ve Performans:** Sadece "bitirdim" demek yerine, hangi konudan toplam kaç soru çözdüğünü kaydederek gelişimini rakamlarla görmeni sağlar.

- **Görsel İlerleme Çubukları (Progress Bars):** Her ders için yüzde kaçlık bir tamamlanma oranına sahip olduğunu dinamik grafiklerle takip edebilir, motivasyonunu yüksek tutabilirsin.

Eksik Analizi: Çözülen soru sayıları ve deneme sonuçlarına göre "zayıf" olduğun konuları otomatik olarak belirleyerek, tekrar etmen gereken noktaları hatırlatır.

✅ **İstatistikler & Grafikler:** 
Çalışma verilerini anlamlı istatistiklere dönüştürerek, adayın kendi gelişimini bir veri bilimci gözüyle incelemesini sağlar.

- **Dinamik Zaman Çizelgeleri:** Günlük, haftalık ve aylık periyotlarda çalışma sürelerini ve çözülen soru sayılarını sütun ve çizgi grafikleriyle görselleştirir.

- **Ders Dağılım Pastası:** Toplam çalışma süresinin hangi derslere (Matematik, Tarih, Coğrafya vb.) harcandığını yüzde olarak göstererek, dengesiz çalışma programlarını tespit etmeyi sağlar.

- **Isı Haritası (Heatmap):** Ay boyunca hangi günlerin daha verimli geçtiğini bir takvim üzerinde "yoğunluk haritası" şeklinde sunarak istikrarı teşvik eder.

- **Kıyaslamalı Analiz:** Geçtiğimiz haftaya veya aya göre performansın ne yönde (artış/azalış) değiştiğini anlık olarak raporlar.

- ✅ **Karanlık Mod Desteği:** Gece çalışmalarında göz yormayan arayüz seçeneği bulunmaktadır.

---

## 🛠 Kullanılan Teknolojiler

| Alan | Teknoloji |
| :--- | :--- |
| **Framework** | React Native (Expo) |
| **Dil** | JavaScript / TypeScript |
| **State Management** | Redux Toolkit / Context API |
| **Veritabanı & Auth** | SQL Lite |
| **UI Kütüphanesi** | React Paper / NativeWind (Tailwind) |
| **Grafikler** | React Native Chart Kit |

---

## ⚙️ Kurulum

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

### Gereksinimler
- Node.js (v16 veya üzeri)
- npm veya yarn
- Expo Go uygulaması (Mobil cihazda test etmek için)

### Adımlar
1. **Depoyu klonlayın:**
   ```bash
   git clone https://github.com/erenkirekbilek/kpss-focus.git
   cd kpss-focus
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Uygulamayı başlatın:**
   ```bash
   npx expo start
   ```

4. **Expo Go ile çalıştırın:**
   - React Native emulatorunuz varsa: `npm run android` veya `npm run ios`
   - Mobil cihazda test etmek için Expo Go uygulamasını kullanın

---

## 🚀 Kullanım

1. **Hoş Geldiniz:** Uygulamayı ilk açtığınızda karşınıza hoş geldiniz ekranı çıkar.
2. **Ana Sayfa:** Pomodoro sayacınız, günlük istatistikleriniz ve hızlı erişim butonları burada yer alır.
3. **Konular:** KPSS konularınızı ekleyebilir, her konu için soru sayınızı takip edebilirsiniz.
4. **True-False:** Doğru/Yanlış soru çalışmalarınızı burada yapabilirsiniz.
5. **İstatistikler:** Performansınızı grafiklerle analiz edebilirsiniz.
6. **Oyun:** Dinlenme molası için eğlenceli mini oyunlar oynayabilirsiniz.

---

## 📸 Proje Görselleri

| Sayfa | Görsel |
| :--- | :--- |
| Project-Demo | ![Welcome](./assets/images/project-images/project-video.gif) |
| Welcome | ![Welcome](./assets/images/project-images/Welcome-Page.png) |
| Ana Sayfa | ![Dashboard](./assets/images/project-images/Dashboard.png) |
| Konular | ![Subjects](./assets/images/project-images/subjects.png) |
| True-False | ![True-False](./assets/images/project-images/True-False.png) |
| İstatistikler | ![Stats](./assets/images/project-images/stats.png) |
| Sorular | ![Questions](./assets/images/project-images/Questions.png) |
| Eğlence | ![Enjoy](./assets/images/project-images/Enjoy.png) |

---

## 🎬 Proje Videosu

![GIF Açıklaması](./assets/images/project-images/project-video.gif).
---

## 🤝 Katkıda Bulunma

Katkıda bulunmak isterseniz, lütfen bir "pull request" oluşturun veya "issues" bölümünden bildirin.

---

## 📄 Lisans

Bu proje [MIT Lisansı](./LICENSE) ile lisanslanmıştır.

---

## 📬 İletişim

- **E-posta:** erenzirekbilek@hotmail.com
- **GitHub:** [https://github.com/erenkirekbilek/kpss-focus](https://github.com/erenkirekbilek/kpss-focus)