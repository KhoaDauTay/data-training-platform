---
id: e-st-l3-05
engine: stack
level: L3
module: warehouse
title: "Lịch chạy: Airflow và các job dbt"
title_en: "Schedules: Airflow and dbt jobs"
kind: concept
runtime: docs
minutes: 15
figures: [{ name: st-orchestration, at: idea }]
objectives:
  - vi: Phân biệt DAG các task của Airflow với DAG các model của dbt, và biết lần thử lại (`retries`) làm gì.
    en: Tell Airflow's DAG of tasks from dbt's DAG of models, and know what retries (`retries`) do.
  - vi: Đọc nhật ký lần chạy đêm qua và trả lời "đã đủ để đăng số chưa" trước khi gửi báo cáo.
    en: Read last night's run log and answer "is it safe to publish" before sending a report.
requires: [e-st-l2-05]
sources:
  - { url: "https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html", title: "Airflow docs: Dags" }
  - { url: "https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/tasks.html", title: "Airflow docs: Tasks" }
  - { url: "https://docs.getdbt.com/reference/commands/build", title: "dbt docs: build" }
demo_setup: |
  CREATE TABLE task_runs (
    task_id text, try_number int,
    state text, ended_at timestamp
  );
  INSERT INTO task_runs VALUES
    ('extract_shop', 1, 'success', '2026-10-31 01:10'),
    ('extract_pay', 1, 'failed', '2026-10-31 01:20'),
    ('extract_pay', 2, 'success', '2026-10-31 01:35'),
    ('dbt_run', 1, 'success', '2026-10-31 02:30'),
    ('dbt_test', 1, 'failed', '2026-10-31 02:40'),
    ('dbt_test', 2, 'failed', '2026-10-31 02:50'),
    ('publish_dash', 1, 'upstream_failed', '2026-10-31 02:50');
quiz:
  - q:
      vi: "Một task đặt `retries=2`. Nó trượt lần 1 và lần 2, qua ở lần 3. Trạng thái cuối là gì, và nó đã chạy mấy lần?"
      en: "A task is set to `retries=2`. It fails on try 1 and try 2 and succeeds on try 3. What is its final state, and how many times did it run?"
    options:
      - { vi: "Trượt, chạy 2 lần", en: "Failed, ran 2 times" }
      - { vi: "Qua, chạy 3 lần", en: "Succeeded, ran 3 times" }
      - { vi: "Qua, chạy 2 lần", en: "Succeeded, ran 2 times" }
    answer: 1
    trap: 2
    why:
      vi: "\"retries=2\" dễ đọc thành \"chạy tối đa 2 lần\", nhưng đó là số lần **thử lại** sau lần đầu: 1 + 2 = 3 lần tối đa. Lần 3 qua nên trạng thái cuối là qua. \"Trượt, 2 lần\" là khi chỉ có 2 lần chạy mà cả hai trượt."
      en: "\"retries=2\" is easy to read as \"at most 2 runs\", but it is the number of **retries** after the first try: 1 + 2 = 3 tries at most. Try 3 succeeds, so the final state is success. \"Failed, 2 times\" would be only 2 runs, both failing."
  - q:
      vi: "Task `dbt_test` trượt cả hai lần thử, và `publish_dash` báo `upstream_failed`. Sáng nay bạn làm gì?"
      en: "Task `dbt_test` failed on both tries, and `publish_dash` shows `upstream_failed`. What do you do this morning?"
    options:
      - { vi: "Tăng `retries` lên 5 cho test qua", en: "Raise `retries` to 5 so the test passes" }
      - { vi: "Đánh dấu `publish_dash` là qua bằng tay", en: "Mark `publish_dash` as success by hand" }
      - { vi: "Giữ số hôm qua kèm ghi chú, báo test trượt", en: "Keep yesterday's numbers with a note, raise the test" }
    answer: 2
    trap: 0
    why:
      vi: "Thử lại thêm nghe như sẽ qua, nhưng retry chỉ cứu lỗi thoáng qua (mạng, khóa). Một test dữ liệu trượt hai lần với cùng dữ liệu sẽ trượt cả lần 3, 4, 5. Đánh dấu qua bằng tay là đăng số mà test đã chặn. Giữ số đã kiểm của hôm qua, ghi rõ, và báo người lo model."
      en: "More retries sound like they will get it through, but a retry only saves a transient fault (network, a lock). A data test that failed twice on the same data will fail on try 3, 4 and 5 too. Marking success by hand publishes numbers the test blocked. Keep yesterday's checked numbers, say so, and raise it with the model's owner."
---
## Mở bài

Mỗi đêm, đường ống của Chợ Lồng Đèn chạy theo lịch: chép dữ liệu, dựng model, chạy test, rồi làm mới dashboard. Sáng nay, trước khi gửi số cho sếp, bạn cần biết đêm qua chạy tới đâu.

## Ý chính

**Airflow** sắp lịch các **task** thành một DAG: chép nguồn, rồi dựng model (`dbt run`), chạy test (`dbt test`), rồi làm mới dashboard. Đây là DAG của task, khác DAG của model trong dbt: mỗi bước dbt chỉ là một task, còn bên trong dbt tự sắp các model theo `ref()`. Gộp lại, `dbt build` chạy model, test, snapshot và seed theo thứ tự DAG, và một test trượt chặn các model đứng sau nó.

Mỗi task có thể đặt `retries` (số lần thử lại sau lần đầu) và `retry_delay` (chờ bao lâu giữa hai lần). Thử lại cứu lỗi thoáng qua như mạng chập chờn, không cứu một test dữ liệu trượt. Task sau một task trượt nhận trạng thái `upstream_failed` và không chạy. Airflow 2 có tính năng SLA; Airflow 3.0 đã bỏ nó, và 3.1 thay bằng Deadline Alerts.

Người phân tích không viết DAG, nhưng đọc nhật ký lần chạy: trạng thái cuối của mỗi task là lần thử cuối, không phải mọi dòng "trượt". Chỉ đăng số khi mọi task của lần chạy đều qua. Hình cuối mục là DAG đêm qua, với test trượt chặn dashboard.

## Cú pháp

```text
# Airflow (read only)
@task(retries=2,
      retry_delay=timedelta(minutes=5))
def extract_pay(): ...

extract_shop >> dbt_run
extract_pay >> dbt_run
dbt_run >> dbt_test >> publish_dash
```

```sql
-- final state = the last try
SELECT DISTINCT ON (task_id)
  task_id, state
FROM task_runs
ORDER BY task_id, try_number DESC;
```

- `retries=2` nghĩa là tối đa 3 lần chạy.
- `upstream_failed`: task không chạy vì task trước nó trượt.

## Ví dụ

Trạng thái cuối của mỗi task đêm qua:

```sql
SELECT DISTINCT ON (task_id)
  task_id, try_number, state
FROM task_runs
ORDER BY task_id, try_number DESC;
```

Những task cần thử lại:

```sql
SELECT task_id, count(*) AS tries
FROM task_runs
GROUP BY task_id
HAVING count(*) > 1
ORDER BY task_id;
```

## Lỗi hay gặp

Đếm mọi dòng `failed`: `extract_pay` trượt lần 1 nhưng đã qua lần 2.

```sql
-- WRONG: counts failed tries
SELECT count(*) AS failed_tasks
FROM task_runs
WHERE state = 'failed';
```

```sql
-- FIX: only each task's last try
SELECT count(*) AS failed_tasks
FROM (SELECT DISTINCT ON (task_id)
    task_id, state
  FROM task_runs
  ORDER BY task_id, try_number DESC) t
WHERE state = 'failed';
```

Đăng số vì `dbt_run` đã qua: test chạy sau nó lại trượt.

```sql
-- WRONG: one task says ready
SELECT bool_and(state = 'success')
  AS ready
FROM task_runs
WHERE task_id = 'dbt_run';
```

```sql
-- FIX: every task's last try passed
SELECT bool_and(state = 'success')
  AS ready
FROM (SELECT DISTINCT ON (task_id)
    task_id, state
  FROM task_runs
  ORDER BY task_id, try_number DESC) t;
```

## Tóm tắt

- Airflow sắp task thành DAG; bên trong task dbt, dbt sắp model theo `ref()`.
- `retries` là số lần thử lại sau lần đầu; chỉ cứu lỗi thoáng qua.
- Trạng thái của task là lần thử cuối; đăng số khi mọi task đều qua.
- SLA của Airflow 2 đã bỏ ở 3.0; 3.1 có Deadline Alerts.

# EN

## Opening

Every night, Lantern Market's pipeline runs on a schedule: copy the data, build the models, run the tests, then refresh the dashboard. This morning, before sending numbers to your manager, you need to know how far last night got.

## Key idea

**Airflow** schedules **tasks** as a DAG: copy the sources, then build the models (`dbt run`), run the tests (`dbt test`), then refresh the dashboard. This is a DAG of tasks, not dbt's DAG of models: each dbt step is one task, and inside it dbt orders the models by `ref()`. Combined, `dbt build` runs models, tests, snapshots and seeds in DAG order, and a failing test blocks the models after it.

Each task can set `retries` (how many times to try again after the first) and `retry_delay` (how long to wait between tries). Retrying saves transient faults such as a flaky network, not a failing data test. A task after a failed task gets the state `upstream_failed` and does not run. Airflow 2 had an SLA feature; Airflow 3.0 removed it, and 3.1 replaced it with Deadline Alerts.

An analyst does not write the DAG, but reads the run log: a task's final state is its last try, not every "failed" row. Publish only when every task of the run passed. The figure at the end of this section is last night's DAG, with the failing test blocking the dashboard.

## Syntax

```text
# Airflow (read only)
@task(retries=2,
      retry_delay=timedelta(minutes=5))
def extract_pay(): ...

extract_shop >> dbt_run
extract_pay >> dbt_run
dbt_run >> dbt_test >> publish_dash
```

```sql
-- final state = the last try
SELECT DISTINCT ON (task_id)
  task_id, state
FROM task_runs
ORDER BY task_id, try_number DESC;
```

- `retries=2` means at most 3 runs.
- `upstream_failed`: the task did not run because a task before it failed.

## Example

Each task's final state last night:

```sql
SELECT DISTINCT ON (task_id)
  task_id, try_number, state
FROM task_runs
ORDER BY task_id, try_number DESC;
```

The tasks that needed retries:

```sql
SELECT task_id, count(*) AS tries
FROM task_runs
GROUP BY task_id
HAVING count(*) > 1
ORDER BY task_id;
```

## Common mistakes

Counting every `failed` row: `extract_pay` failed on try 1 but passed on try 2.

```sql
-- WRONG: counts failed tries
SELECT count(*) AS failed_tasks
FROM task_runs
WHERE state = 'failed';
```

```sql
-- FIX: only each task's last try
SELECT count(*) AS failed_tasks
FROM (SELECT DISTINCT ON (task_id)
    task_id, state
  FROM task_runs
  ORDER BY task_id, try_number DESC) t
WHERE state = 'failed';
```

Publishing because `dbt_run` passed: the test that runs after it failed.

```sql
-- WRONG: one task says ready
SELECT bool_and(state = 'success')
  AS ready
FROM task_runs
WHERE task_id = 'dbt_run';
```

```sql
-- FIX: every task's last try passed
SELECT bool_and(state = 'success')
  AS ready
FROM (SELECT DISTINCT ON (task_id)
    task_id, state
  FROM task_runs
  ORDER BY task_id, try_number DESC) t;
```

## Recap

- Airflow orders tasks as a DAG; inside the dbt task, dbt orders models by `ref()`.
- `retries` is the number of tries after the first; it only saves transient faults.
- A task's state is its last try; publish when every task passed.
- Airflow 2's SLAs were removed in 3.0; 3.1 has Deadline Alerts.
