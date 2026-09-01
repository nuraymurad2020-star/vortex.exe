# Vortex — Agentic AI Workspace (skelet layihə)

Bu, sizin istədiyiniz "Cursor / Antigravity kimi" agentic AI proqramının **başlanğıc skeletidir**:
backend tam işlək və test olunub, client (Windows `.exe` görünüşü) isə Visual Studio-da
sizin build etməli olduğunuz C# WPF layihəsidir (mən Linux mühitində Windows `.exe`
kompayl edə bilmirəm — buna görə kodu hazır verib, addım-addım build təlimatı yazıram).

## ⚠️ ƏN VACİB ADDIM — İLK ONU EDİN

Mesajınızda paylaşdığınız NVIDIA API açarı artıq **kompromis olunmuş** sayılır
(çünki bu söhbətdə açıq mətn kimi göndərildi). build.nvidia.com hesabınıza girib:
1. O açarı **ləğv edin (revoke/delete)**.
2. Yeni açar yaradın.
3. Yeni açarı **yalnız** `backend/.env` faylına yazın (bu fayl `.gitignore`-dadır,
   heç vaxt paylaşmayın, heç vaxt `.exe` içinə "gizlətməyə" çalışmayın).

`.exe` içinə yazılan hər hansı sirr, decompile/string-dump ilə saniyələr içində
çıxarıla bilər — ona görə arxitektura belədir: **açar yalnız sizin öz kompüterinizdə
işləyən local backend serverdə qalır**, `.exe` (client) heç vaxt açarı görmür,
sadəcə `http://localhost:4321`-ə sorğu göndərir.

## Struktur

```
vortex/
├── backend/          ← Node.js server (NVIDIA API-yə proxy, tool-calling, fayl agent-ləri)
│   ├── server.js
│   ├── agents.js     ← 5 model reyestri (Kimi K3, DeepSeek V4 Pro/Flash, MiniMax M3, Nemotron Ultra)
│   ├── tools/fileTools.js   ← fayl yarat/oxu/yaz/əlavə et/sil/siyahıla (sandboxed)
│   ├── workspace/    ← agent-lərin fayl yaratdığı qovluq
│   └── .env.example  ← BURAYA öz açarınızı yazacaqsınız (kopyalayıb .env adlandırın)
└── client/Vortex/    ← C# WPF layihəsi (Visual Studio-da açılır, .exe olaraq build edilir)
    ├── Vortex.csproj
    ├── App.xaml(.cs)
    ├── LoginWindow.xaml(.cs)   ← proqram açılanda ilk görünən pəncərə, Google login
    ├── MainWindow.xaml(.cs)    ← chat + agent seçimi + workspace görünüşü
    └── Assets/vortex.ico       ← hazır loqo
```

## 1) Backend-i işə salmaq

```bash
cd backend
npm install
cp .env.example .env
# .env faylını açıb NVIDIA_API_KEY-i (yeni açarınızı) yazın
npm start
```

Server `http://localhost:4321` ünvanında işə düşür. Test edin:
```
GET http://localhost:4321/api/agents   → 5 modelin siyahısını qaytarmalıdır
```

## 2) Google giriş (OAuth) qurmaq

1. https://console.cloud.google.com → yeni layihə → "OAuth consent screen" qurun.
2. "Credentials" → "OAuth client ID" → tip: **Web application**.
3. Authorized redirect URI: `http://localhost:4321/auth/google/callback`
4. Alınan Client ID / Client Secret-i `.env`-ə yazın.

Bunu qurmasanız, `LoginWindow` boş/xəta ekranı göstərəcək — test üçün
`LoginWindow.xaml.cs`-də `SkipLogin_Click` metodunu bir düyməyə bağlayıb girişi
müvəqqəti keçə bilərsiniz (kod artıq hazırdır, sadəcə XAML-a bir `<Button>`
əlavə edin).

## 3) Client-i (.exe) build etmək — 2 üsul

### Üsul A — GitHub Actions (Windows/Visual Studio quraşdırmadan, brauzerdən)

Layihədə artıq hazır `.github/workflows/build.yml` var. Bu, GitHub-un pulsuz
Windows serverində avtomatik `Vortex.exe` tərtib edir. Addımlar:

1. github.com-da pulsuz hesab açın (yoxdursa).
2. Yeni **repository** yaradın (məs. `vortex`), "Public" və ya "Private" fərq etməz.
3. Bu `vortex` qovluğunun bütün məzmununu o repoya yükləyin (ən asanı: repo
   səhifəsində "Add file → Upload files" ilə sürüşdürüb buraxmaq, ya da `git push`).
4. Repo-nun **"Actions"** tabına keçin — "Vortex .exe qur" iş axını avtomatik
   başlayacaq (bir neçə dəqiqə çəkir).
5. Bitəndə həmin iş axınının səhifəsində aşağıda **"Artifacts"** bölməsində
   `Vortex-exe` görünəcək — üstünə klikləyib zip yükləyin, içində `Vortex.exe` var.

Heç bir Visual Studio, heç bir quraşdırma tələb etmir — hər şey brauzerdə olur.

### Üsul B — Öz kompüterinizdə Visual Studio ilə

Windows-da, Visual Studio 2022 (".NET desktop development" workload ilə) və ya
`dotnet` CLI ilə:

```bash
cd client/Vortex
dotnet restore
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true
```

Nəticə: `bin/Release/net8.0-windows/win-x64/publish/Vortex.exe`
— tək fayl, öz içində .NET runtime-ı da daşıyır, loqosu Assets/vortex.ico-dur.

## Necə işləyir (agentic tərəf)

`POST /api/chat` çağırılanda backend seçilmiş modelə (Kimi/DeepSeek/MiniMax/Nemotron)
sizin mesajı göndərir. Model "tool_calls" qaytarırsa (yəni "mən fayl yaratmaq/oxumaq
istəyirəm" deyirsə), server bunu **avtomatik icra edir** (`fileTools.js`) və nəticəni
yenidən modelə göndərir — bu dövrə model son cavabı verənə qədər davam edir
(maksimum 6 dövrə, sonsuz loop-un qarşısını almaq üçün). Bu, Cursor/Antigravity-nin
əsas işləmə prinsipinə bənzəyir.

## Növbəti addımlar (özünüz və ya mənimlə davam edə bilərsiniz)

- [ ] Çoxlu agent-in **paralel** işləməsi (məs. bir agent kod yazır, o biri test edir)
- [ ] Şəkil/video/səs faylları üçün generasiya alətləri (ayrı API-lər tələb edir)
- [ ] Workspace fayl ağacının UI-da tam göstərilməsi (`list_dir` alətinin UI-a bağlanması)
- [ ] Tool icrasının UI-da canlı göstərilməsi ("Fayl yaradılır: app.js...")
- [ ] Xəta/rate-limit idarəetməsi, streaming cavablar
