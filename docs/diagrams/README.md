# Sơ đồ

Các sơ đồ viết bằng Mermaid, hiển thị trực tiếp trên GitHub và VS Code. Khi đưa vào báo cáo Word, xuất ảnh bằng [Mermaid Live Editor](https://mermaid.live) hoặc `mmdc`.

## 1. Kiến trúc triển khai cục bộ

```mermaid
flowchart LR
    subgraph Host["Máy cá nhân (chỉ 127.0.0.1)"]
        Browser["Trình duyệt"]
        Postman["Postman / Newman"]
    end
    subgraph Net["Mạng Docker riêng queryshield-private"]
        Web["web<br/>React + Vite"]
        API["api<br/>FastAPI"]
        Admin["lab-admin<br/>CLI bootstrap/reset<br/>(chạy một lần)"]
        DB[("db<br/>PostgreSQL 17")]
    end
    Browser -->|":5173"| Web
    Web -->|"/api proxy"| API
    Postman -->|":8000"| API
    API -->|"qs_lab_query<br/>chỉ đọc demo.users"| DB
    API -->|"qs_lab_app<br/>lưu run, sự kiện"| DB
    Admin -->|"superuser<br/>không cấp cho API"| DB
```

## 2. Mô-đun backend

```mermaid
flowchart TB
    Router["laboratory/router.py<br/>evaluation/router.py<br/>securedesk/router.py"] --> Service["laboratory/service.py<br/>guard + điều phối lớp"]
    Service --> Guard["core/guards.py<br/>APP_ENV=local AND LAB_ENABLE_UNSAFE"]
    Service --> Layers["defenses/layers.py<br/>L2 allow-list · L4 che lỗi · L5 giám sát"]
    Service --> Secure["adapters/secure.py<br/>bind tham số %s"]
    Service -. "import trễ, chỉ khi guard cho phép" .-> Vuln["adapters/vulnerable.py<br/>nối chuỗi (duy nhất)"]
    Service --> Inspector["inspector.py<br/>bản xem trước đã che"]
    Service --> Repo["experiments/repository.py<br/>lab.runs, lab.security_events"]
    Eval["evaluation/runner.py<br/>ma trận C0–C3"] --> Service
    Priv["defenses/privileges.py<br/>L3 đo quyền từ catalog"] --> Repo
```

## 3. Trình tự một lần chạy

```mermaid
sequenceDiagram
    actor U as Người trình bày
    participant W as Web / Postman
    participant A as API
    participant S as Service
    participant P as PostgreSQL
    U->>W: Chọn chế độ, lớp, nhập thông tin
    W->>A: POST /labs/login-bypass/execute
    A->>S: Kiểm tra schema (Pydantic, 1–128 ký tự)
    alt Chế độ nối chuỗi và guard tắt
        S-->>A: 403 LAB_DISABLED (ghi run)
    else L2 bật và tên không qua allow-list
        S-->>A: REJECTED_BY_VALIDATION (không gửi SQL)
    else Chạy truy vấn
        S->>P: SELECT ... trên role qs_lab_query (chỉ đọc, timeout 2s)
        P-->>S: 0..n dòng hoặc lỗi cú pháp
    end
    S->>P: INSERT lab.runs + lab.security_events (qs_lab_app, không lưu mật khẩu)
    S-->>A: outcome, inspector, layers, alerts, run_id, duration_ms
    A-->>W: 200 JSON, không Set-Cookie
```

## 4. Vì sao payload vượt được đăng nhập

```mermaid
flowchart LR
    I["Input: admin' -- "] --> C["Nối vào chuỗi SQL"]
    C --> Q["WHERE username = 'admin' -- ' AND password_hash = crypt(...)"]
    Q --> L1["' đóng chuỗi sớm"]
    Q --> L2["-- biến phần sau thành chú thích"]
    L2 --> R["Điều kiện mật khẩu không được thực thi"]
    R --> O["Trả về dòng admin"]
    I --> B["Bind tham số $1"]
    B --> D["So sánh nguyên chuỗi như dữ liệu"]
    D --> N["0 dòng: từ chối"]
```

## 5. Ranh giới phân quyền cơ sở dữ liệu

```mermaid
flowchart TB
    subgraph demo["schema demo"]
        users["demo.users<br/>(password_hash bcrypt)"]
        tickets["demo.tickets"]
    end
    subgraph lab["schema lab"]
        runs["lab.runs"]
        events["lab.security_events"]
        meta["lab.scenarios · test_cases · dataset"]
    end
    Q["qs_lab_query<br/>read-only, 2s"] -->|SELECT| users
    A["qs_lab_app"] -->|"SELECT (không password_hash)"| users
    A -->|SELECT| tickets
    A -->|SELECT, INSERT| runs
    A -->|SELECT, INSERT| events
    A -->|SELECT| meta
```

## 6. Thiết kế ma trận đánh giá

```mermaid
flowchart LR
    subgraph Cases["5 ca"]
        T01["T01 hợp lệ"]
        T11["T11 hợp lệ o'connor"]
        T02["T02 sai mật khẩu"]
        T04["T04 không tồn tại"]
        T03["T03 tấn công"]
    end
    subgraph Configs["4 cấu hình"]
        C0["C0 nối chuỗi"]
        C1["C1 nối chuỗi + L2"]
        C2["C2 bind tham số"]
        C3["C3 bind + L2"]
    end
    Cases --> Run["20 lần chạy thật<br/>cùng fixture"] 
    Configs --> Run
    Run --> M["Chặn tấn công · chặn nhầm ·<br/>cảnh báo L5 · thời gian"]
    M --> R["reports/evaluation/*.md, *.json"]
```
