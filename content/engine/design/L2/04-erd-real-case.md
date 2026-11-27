---
id: e-ds-l2-04
engine: design
level: L2
module: er-mapping
title: Vẽ ERD cho một bài toán thật - phòng khám
title_en: Designing an ERD for a real case - a clinic
kind: lab
runtime: browser
minutes: 25
figures: [{ name: ds-er-clinic, at: example }]
objectives:
  - vi: Đi từ lời mô tả nghiệp vụ tới danh sách thực thể, mối quan hệ và luật.
    en: Go from a business description to a list of entities, relationships and rules.
  - vi: Biến một luật nghiệp vụ ("không đặt trùng lịch") thành ràng buộc của database.
    en: Turn a business rule ("no double booking") into a database constraint.
  - vi: Dựng schema từng bước và kiểm nó bằng một truy vấn thật.
    en: Build the schema step by step and check it with a real query.
requires: [e-ds-l2-03]
sources:
  - { url: https://doi.org/10.1145/320434.320440, title_vi: "Bài báo ACM 10.1145/320434.320440" }
  - { url: https://www.postgresql.org/docs/18/ddl-constraints.html, title_vi: "Ràng buộc" }
  - { url: https://www.postgresql.org/docs/18/sql-createtable.html, title_vi: "CREATE TABLE" }
lab:
  setup: |
    CREATE TABLE specialties (id int PRIMARY KEY, name text NOT NULL UNIQUE);
    CREATE TABLE patients (id int PRIMARY KEY, full_name text NOT NULL, phone text NOT NULL UNIQUE);
    INSERT INTO specialties VALUES (1, 'cardiology'), (2, 'dermatology');
    INSERT INTO patients VALUES (1, 'Tran An', '0901000001'), (2, 'Le Binh', '0901000002'), (3, 'Pham Chi', '0901000003');
  steps:
    - task:
        vi: "Mỗi bác sĩ có đúng một chuyên khoa. Tạo `doctors`: `id int` khóa chính, `full_name text` không null, `specialty_id int` không null trỏ tới `specialties (id)`. Đừng đặt tên ràng buộc."
        en: "Each doctor has exactly one specialty. Create `doctors`: `id int` primary key, `full_name text` not null, `specialty_id int` not null pointing to `specialties (id)`. Do not name the constraints."
      solution: CREATE TABLE doctors (id int PRIMARY KEY, full_name text NOT NULL, specialty_id int NOT NULL REFERENCES specialties (id))
      check: catalog
      hint:
        vi: 1:N từ chuyên khoa tới bác sĩ, khóa ngoại ở phía bác sĩ.
        en: 1:N from specialty to doctor, the foreign key on the doctor side.
    - task:
        vi: "Lịch hẹn nối bệnh nhân và bác sĩ, một bác sĩ không có hai lịch cùng giờ bắt đầu. Tạo `appointments`: `id int` khóa chính, `patient_id int` không null trỏ tới `patients (id)`, `doctor_id int` không null trỏ tới `doctors (id)`, `starts_at timestamp` không null, và `UNIQUE (doctor_id, starts_at)`. Đừng đặt tên ràng buộc."
        en: "An appointment links a patient and a doctor, and a doctor has no two appointments with the same start time. Create `appointments`: `id int` primary key, `patient_id int` not null pointing to `patients (id)`, `doctor_id int` not null pointing to `doctors (id)`, `starts_at timestamp` not null, and `UNIQUE (doctor_id, starts_at)`. Do not name the constraints."
      solution: CREATE TABLE appointments (id int PRIMARY KEY, patient_id int NOT NULL REFERENCES patients (id), doctor_id int NOT NULL REFERENCES doctors (id), starts_at timestamp NOT NULL, UNIQUE (doctor_id, starts_at))
      check: catalog
      hint:
        vi: "Ràng buộc nhiều cột đặt cuối danh sách cột: `UNIQUE (doctor_id, starts_at)`."
        en: "A multi-column constraint goes at the end of the column list: `UNIQUE (doctor_id, starts_at)`."
    - task:
        vi: "Thêm hai bác sĩ trong một câu: (1, 'Lan', chuyên khoa 1) và (2, 'Minh', chuyên khoa 2)."
        en: "Add two doctors in one statement: (1, 'Lan', specialty 1) and (2, 'Minh', specialty 2)."
      solution: INSERT INTO doctors VALUES (1, 'Lan', 1), (2, 'Minh', 2)
      after: SELECT id, full_name, specialty_id FROM doctors ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`INSERT INTO doctors VALUES (…), (…)` theo thứ tự cột `id`, `full_name`, `specialty_id`."
        en: "`INSERT INTO doctors VALUES (…), (…)` in column order `id`, `full_name`, `specialty_id`."
    - task:
        vi: "Đặt ba lịch trong một câu: (1, bệnh nhân 1, bác sĩ 1, '2026-11-02 09:00'), (2, bệnh nhân 2, bác sĩ 1, '2026-11-02 09:30'), (3, bệnh nhân 3, bác sĩ 2, '2026-11-02 09:00')."
        en: "Book three appointments in one statement: (1, patient 1, doctor 1, '2026-11-02 09:00'), (2, patient 2, doctor 1, '2026-11-02 09:30'), (3, patient 3, doctor 2, '2026-11-02 09:00')."
      solution: INSERT INTO appointments VALUES (1, 1, 1, '2026-11-02 09:00'), (2, 2, 1, '2026-11-02 09:30'), (3, 3, 2, '2026-11-02 09:00')
      after: SELECT id, patient_id, doctor_id, starts_at FROM appointments ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "Thứ tự cột: `id`, `patient_id`, `doctor_id`, `starts_at`. Hai lịch cùng 09:00 vẫn hợp lệ vì khác bác sĩ."
        en: "Column order: `id`, `patient_id`, `doctor_id`, `starts_at`. Two 09:00 appointments are fine because the doctors differ."
    - task:
        vi: "Kiểm schema bằng một câu thật: số lịch hẹn theo tên chuyên khoa, cột `name` và `appointments`, xếp theo `name`."
        en: "Check the schema with a real query: the number of appointments per specialty name, columns `name` and `appointments`, ordered by `name`."
      solution: SELECT s.name, count(*) AS appointments FROM appointments a JOIN doctors d ON d.id = a.doctor_id JOIN specialties s ON s.id = d.specialty_id GROUP BY s.name ORDER BY s.name
      check: rows
      ordered: true
      hint:
        vi: Nối lịch hẹn với bác sĩ, bác sĩ với chuyên khoa, rồi `GROUP BY s.name`.
        en: Join appointments to doctors, doctors to specialties, then `GROUP BY s.name`.
quiz:
  - q:
      vi: "Một bệnh nhân có thể khám nhiều bác sĩ, một bác sĩ khám nhiều bệnh nhân. Tại sao `appointments` có `id` riêng thay vì khóa (`patient_id`, `doctor_id`)?"
      en: "A patient can see many doctors and a doctor sees many patients. Why does `appointments` have its own `id` instead of the key (`patient_id`, `doctor_id`)?"
    options:
      - { vi: "Vì cùng một cặp bệnh nhân - bác sĩ có thể gặp nhau nhiều lần, mỗi lần một lịch", en: "Because the same patient-doctor pair can meet many times, one appointment each time" }
      - { vi: "Vì bảng nối M:N không bao giờ dùng khóa ghép", en: "Because M:N junction tables never use composite keys" }
      - { vi: "Vì khóa ghép làm truy vấn chậm hơn", en: "Because composite keys make queries slower" }
    answer: 0
    trap: 1
    why:
      vi: "\"Bảng nối không bao giờ dùng khóa ghép\" sai: luật thường gặp là ngược lại, bảng nối lấy cặp khóa ngoại làm khóa, nhưng chỉ khi mỗi cặp xuất hiện một lần. Ở đây bệnh nhân 1 có thể khám bác sĩ 1 hôm nay và tái khám tuần sau: cùng cặp, hai lịch. Khóa (`patient_id`, `doctor_id`) sẽ từ chối lịch thứ hai, nên lịch hẹn thành một thực thể có `id` riêng. Lý do không phải tốc độ: khóa ghép không làm truy vấn chậm đi đáng kể."
      en: "\"Junction tables never use composite keys\" is wrong: the usual rule is the opposite, a junction table is keyed by its pair of foreign keys, but only when each pair appears once. Here patient 1 can see doctor 1 today and come back next week: the same pair, two appointments. The key (`patient_id`, `doctor_id`) would refuse the second one, so an appointment becomes an entity with its own `id`. Speed is not the reason: a composite key does not make queries noticeably slower."
  - q:
      vi: "`UNIQUE (doctor_id, starts_at)` chặn được trường hợp nào?"
      en: "Which case does `UNIQUE (doctor_id, starts_at)` block?"
    options:
      - { vi: "Mọi lịch chồng giờ của một bác sĩ, kể cả 09:00 và 09:15", en: "Every overlapping appointment of a doctor, even 09:00 and 09:15" }
      - { vi: "Chỉ hai lịch của cùng bác sĩ có cùng giờ bắt đầu", en: "Only two appointments of the same doctor with the same start time" }
      - { vi: "Hai bác sĩ khám cùng giờ", en: "Two doctors working at the same time" }
    answer: 1
    trap: 0
    why:
      vi: "\"Mọi lịch chồng giờ\" nghe hợp lý vì ý định là không đặt trùng lịch, nhưng `UNIQUE` chỉ so bằng nhau: 09:00 và 09:15 là hai giá trị khác nhau, nên lịch 09:15 vẫn qua dù khám chồng lên lịch 09:00. Hai bác sĩ cùng 09:00 cũng qua, vì cặp (`doctor_id`, `starts_at`) khác nhau, như lịch 1 và 3 trong lab. Chặn lịch chồng khoảng thời gian cần ràng buộc loại trừ (exclusion constraint, `EXCLUDE`) trên một khoảng giờ; bài này dừng ở giờ bắt đầu."
      en: "\"Every overlapping appointment\" sounds right because the intent is no double booking, but `UNIQUE` only compares for equality: 09:00 and 09:15 are different values, so the 09:15 appointment passes even though it overlaps the 09:00 one. Two doctors at 09:00 also pass, since the pairs (`doctor_id`, `starts_at`) differ, like appointments 1 and 3 in the lab. Blocking overlapping time ranges needs an exclusion constraint (`EXCLUDE`) on a time range; this lesson stops at start times."
---
## Mở bài

Phòng khám nhờ bạn thiết kế database đặt lịch: bệnh nhân, bác sĩ, chuyên khoa, lịch hẹn, và một luật cứng là bác sĩ không bị đặt trùng giờ. Lời mô tả nghiệp vụ không bao giờ nói sẵn "đây là thực thể", bạn phải tự gạn ra. Bài này đi trọn một vòng: đọc, vẽ, dựng, kiểm.

## Ý chính

Bước một, gạch dưới danh từ trong lời mô tả: bệnh nhân, bác sĩ, chuyên khoa, lịch hẹn. Danh từ có danh tính và nhiều thuộc tính là thực thể; danh từ chỉ là một giá trị (số điện thoại, giờ) là thuộc tính. Bước hai, gạch dưới động từ: "bác sĩ thuộc chuyên khoa", "bệnh nhân đặt lịch với bác sĩ". Mỗi động từ là một mối quan hệ; hỏi lực lượng và mức tham gia cho từng phía.

Bước ba, tìm luật: "mỗi bác sĩ đúng một chuyên khoa" thành `NOT NULL` trên khóa ngoại; "số điện thoại không trùng" thành `UNIQUE`; "không đặt trùng giờ" thành `UNIQUE (doctor_id, starts_at)`. Luật nào database giữ được thì để database giữ, đừng chỉ ghi trong tài liệu.

Nhiều người nghĩ một mối quan hệ M:N luôn là bảng nối có khóa là cặp khóa ngoại. Thật ra khi cùng một cặp gặp nhau nhiều lần (bệnh nhân tái khám), mối quan hệ đã thành một sự kiện có thời điểm: nó là thực thể riêng với khóa riêng. Cuối cùng, kiểm bằng truy vấn mà nghiệp vụ sẽ hỏi thật.

## Cú pháp

```sql
CREATE TABLE appointments (
  id int PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients (id),
  doctor_id int NOT NULL REFERENCES doctors (id),
  starts_at timestamp NOT NULL,
  UNIQUE (doctor_id, starts_at)
);
```

- `UNIQUE (a, b)`: cặp giá trị không trùng; từng cột vẫn được lặp.
- `NOT NULL` trên khóa ngoại: lịch nào cũng phải có bệnh nhân và bác sĩ.
- Tên tự đặt của ràng buộc trên: `appointments_doctor_id_starts_at_key`.

## Ví dụ

Cùng mẫu đó cho phòng họp: phòng là "bác sĩ", lượt đặt là "lịch hẹn".

```sql
CREATE TABLE ex_room (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE ex_booking (
  id int PRIMARY KEY,
  room_id int NOT NULL REFERENCES ex_room (id),
  starts_at timestamp NOT NULL,
  UNIQUE (room_id, starts_at)
);
INSERT INTO ex_room VALUES (1, 'blue'), (2, 'green');
INSERT INTO ex_booking VALUES (1, 1, '2026-11-02 09:00'), (2, 2, '2026-11-02 09:00');
SELECT r.name, b.starts_at FROM ex_booking b JOIN ex_room r ON r.id = b.room_id ORDER BY r.name;
```

Đọc lại luật đã khai báo:

```sql
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'ex_booking'::regclass
ORDER BY conname;
```

Hình dưới đây vẽ sơ đồ phòng khám của bài theo lối chân chim: mỗi chuyên khoa có 0..n bác sĩ, mỗi bác sĩ thuộc đúng 1 chuyên khoa; mỗi bác sĩ khám 0..n lịch hẹn và mỗi bệnh nhân đặt 0..n lịch hẹn; mỗi lịch hẹn có đúng 1 bác sĩ và 1 bệnh nhân.

## Lỗi hay gặp

Đặt trùng giờ cho cùng một phòng: luật nằm trong database nên câu bị chặn, dù ứng dụng quên kiểm.

```sql
-- ERROR 23505: duplicate key value violates unique constraint "ex_booking_room_id_starts_at_key"
INSERT INTO ex_booking VALUES (3, 1, '2026-11-02 09:00');
```

Đặt lịch cho một phòng không tồn tại: khóa ngoại chặn.

```sql
-- ERROR 23503: insert or update on table "ex_booking" violates foreign key constraint "ex_booking_room_id_fkey"
INSERT INTO ex_booking VALUES (4, 9, '2026-11-02 10:00');
```

`UNIQUE` không chặn được lịch 09:00 dài một giờ và lịch 09:30 cùng phòng: chúng chồng giờ nhưng không bằng nhau. Việc đó cần ràng buộc `EXCLUDE` trên khoảng thời gian, một chủ đề của Postgres nâng cao.

## Thực hành

Chuyên khoa và bệnh nhân có sẵn. Dựng bác sĩ và lịch hẹn, ghi vài dòng, rồi hỏi số lịch theo chuyên khoa.

## Tóm tắt

- Danh từ có danh tính là thực thể, giá trị đơn là thuộc tính, động từ là mối quan hệ.
- Luật nghiệp vụ thành ràng buộc: `NOT NULL`, `UNIQUE`, khóa ngoại, `CHECK`.
- Cặp gặp nhau nhiều lần thì mối quan hệ thành thực thể có khóa riêng.
- `UNIQUE` chỉ so bằng nhau; lịch chồng khoảng cần `EXCLUDE`.

# EN

## Opening

A clinic asks you to design its booking database: patients, doctors, specialties, appointments, and one hard rule that a doctor is never double booked. A business description never says "this is an entity"; you have to find it yourself. This lesson goes the full round: read, draw, build, check.

## Key idea

Step one, underline the nouns in the description: patient, doctor, specialty, appointment. A noun with identity and several attributes is an entity; a noun that is just one value (a phone number, a time) is an attribute. Step two, underline the verbs: "a doctor belongs to a specialty", "a patient books an appointment with a doctor". Each verb is a relationship; ask cardinality and participation for each side.

Step three, find the rules: "each doctor has exactly one specialty" becomes `NOT NULL` on the foreign key; "phone numbers are unique" becomes `UNIQUE`; "no double booking" becomes `UNIQUE (doctor_id, starts_at)`. Whatever rule the database can keep, let the database keep it, not just the documentation.

Many people think an M:N relationship is always a junction table keyed by the pair of foreign keys. In fact when the same pair meets many times (a patient coming back), the relationship has become an event with a time: it is an entity of its own with its own key. Finally, check with a query the business will really ask.

## Syntax

```sql
CREATE TABLE appointments (
  id int PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients (id),
  doctor_id int NOT NULL REFERENCES doctors (id),
  starts_at timestamp NOT NULL,
  UNIQUE (doctor_id, starts_at)
);
```

- `UNIQUE (a, b)`: the pair of values does not repeat; each column alone still may.
- `NOT NULL` on a foreign key: every appointment must have a patient and a doctor.
- The automatic name of the constraint above: `appointments_doctor_id_starts_at_key`.

## Example

The same pattern for meeting rooms: the room plays the doctor, the booking the appointment.

```sql
CREATE TABLE ex_room (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE ex_booking (
  id int PRIMARY KEY,
  room_id int NOT NULL REFERENCES ex_room (id),
  starts_at timestamp NOT NULL,
  UNIQUE (room_id, starts_at)
);
INSERT INTO ex_room VALUES (1, 'blue'), (2, 'green');
INSERT INTO ex_booking VALUES (1, 1, '2026-11-02 09:00'), (2, 2, '2026-11-02 09:00');
SELECT r.name, b.starts_at FROM ex_booking b JOIN ex_room r ON r.id = b.room_id ORDER BY r.name;
```

Read back the rules you declared:

```sql
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'ex_booking'::regclass
ORDER BY conname;
```

The figure below draws this lesson's clinic diagram in crow's foot style: each specialty has 0..n doctors, each doctor belongs to exactly 1 specialty; each doctor sees 0..n appointments and each patient books 0..n appointments; each appointment has exactly 1 doctor and 1 patient.

## Common mistakes

Booking the same room twice at the same time: the rule lives in the database, so the statement is blocked even if the application forgot to check.

```sql
-- ERROR 23505: duplicate key value violates unique constraint "ex_booking_room_id_starts_at_key"
INSERT INTO ex_booking VALUES (3, 1, '2026-11-02 09:00');
```

Booking a room that does not exist: the foreign key blocks it.

```sql
-- ERROR 23503: insert or update on table "ex_booking" violates foreign key constraint "ex_booking_room_id_fkey"
INSERT INTO ex_booking VALUES (4, 9, '2026-11-02 10:00');
```

`UNIQUE` cannot block a one-hour 09:00 booking and a 09:30 booking of the same room: they overlap but are not equal. That takes an `EXCLUDE` constraint on a time range, an advanced Postgres topic.

## Practice

Specialties and patients are ready. Build doctors and appointments, write a few rows, then ask for the number of appointments per specialty.

## Recap

- A noun with identity is an entity, a single value an attribute, a verb a relationship.
- Business rules become constraints: `NOT NULL`, `UNIQUE`, foreign keys, `CHECK`.
- When a pair meets many times, the relationship becomes an entity with its own key.
- `UNIQUE` only compares for equality; overlapping ranges need `EXCLUDE`.
