# Tutorial route inventory (tutorialspoint database tutorials)

Structure only: tutorial → section → chapter title, URL and order from each tutorial's table of contents, plus each chapter page's own h2/h3 heading texts (`outline` in the JSON), a hash of the page text and the date it was last read (`hash`, `seen`), so a later run can tell what changed. No page text, code or paragraph is stored. Machine-readable copy: [tutorial-routes.json](tutorial-routes.json). Last run's changes: [tutorial-changes.md](tutorial-changes.md). Gap analysis: [boondata-gap-map.md](boondata-gap-map.md).

Method: `npm run kb:crawl` (`scripts/kb/crawl-tutorials.mjs`, see [README.md](README.md#keeping-the-tutorial-inventory-current)), last completed 2026-11-23. It reads robots.txt first and checks every URL against the rules for its user agent `Claude-User` (the site names no rule for it, so the `User-agent: *` rules apply; three named AI crawlers are disallowed everything). The index https://www.tutorialspoint.com/database_tutorials.htm lists the tutorials; `dbms` is added by hand. Requests are sequential, 3 s apart. Image-only links to external video training are dropped; links whose title sits after the closing `</a>` take it from there (`note` in the JSON). Entries the site lists twice are kept as listed.

**36 tutorials, 1430 chapters, 1409 with a heading outline.** 21 chapter pages could not be read on the last run: https://www.tutorialspoint.com/php_mysql/php_mysql_using_sequence.htm (404), https://www.tutorialspoint.com/php_mysql/php_mysql_sql_injection.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_functions_overloading.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_drop_function.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_extract_function.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_replace_function.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_create_role.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_alter_role.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_drop_role.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_grant.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_revoke.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_role_membership.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_intersect_operator.htm (404), https://www.tutorialspoint.com/postgresql/postgresql_error_and_message.htm (404), https://www.tutorialspoint.com/dbms/dbms_designing_erd_for_a_real_life_example.htm (404), https://www.tutorialspoint.com/dbms/dbms_concept_of_functional_dependency.htm (404), https://www.tutorialspoint.com/dbms/other_types_of_indexing.htm (404), https://www.tutorialspoint.com/dbms/need_of_query_processing.htm (404), https://www.tutorialspoint.com/dbms/algorithm_for_external_sorting.htm (404), https://www.tutorialspoint.com/dbms/algorithms_for_selection_and_join_operations.htm (404), https://www.tutorialspoint.com/dbms/algorithms_for_project_and_set_operations.htm (404).

| # | Tutorial | Sections | Chapters | In BoonData scope |
|---|---|---|---|---|
| 1 | [SQL Tutorial](#sql) | 12 | 122 | yes (per-chapter gap map) |
| 2 | [PostgreSQL Tutorial](#postgresql) | 11 | 90 | yes (per-chapter gap map) |
| 3 | [MySQL Tutorial](#mysql) | 17 | 186 | yes (per-chapter gap map) |
| 4 | [SQLite Tutorial](#sqlite) | 4 | 54 | yes (per-chapter gap map) |
| 5 | [MongoDB Tutorial](#mongodb) | 5 | 61 | yes (per-chapter gap map) |
| 6 | [DynamoDB Tutorial](#dynamodb) | 1 | 38 | yes (per-chapter gap map) |
| 7 | [DBMS Tutorial](#dbms) | 15 | 91 | yes (per-chapter gap map) |
| 8 | [Amazon - RDS](#amazonrds) | 1 | 35 | no: managed hosting product; BoonData runs PGlite in the browser |
| 9 | [Apache Derby Tutorial](#apache_derby) | 1 | 25 | no: Java embedded RDBMS; dialect not taught |
| 10 | [ArangoDB Tutorial](#arangodb) | 1 | 18 | no: multi-model database; not taught |
| 11 | [Apache Presto Tutorial](#apache_presto) | 1 | 17 | no: distributed SQL query engine; not taught |
| 12 | [CouchDB Tutorial](#couchdb) | 1 | 14 | no: document store with HTTP API; MongoDB covers the document model |
| 13 | [DB2 Tutorial](#db2) | 1 | 26 | no: IBM DB2 product; dialect not taught |
| 14 | [DocumentDB SQL Tutorial](#documentdb_sql) | 1 | 24 | no: Azure DocumentDB (Cosmos DB) SQL API; not taught |
| 15 | [DocumentDB Tutorial](#documentdb) | 1 | 28 | no: Azure DocumentDB (Cosmos DB); MongoDB covers the document model |
| 16 | [Hazelcast Tutorial](#hazelcast) | 3 | 17 | no: in-memory data grid; not taught |
| 17 | [H2 Database Tutorial](#h2_database) | 3 | 24 | no: Java embedded RDBMS; not taught |
| 18 | [HSQLDB Tutorial](#hsqldb) | 1 | 23 | no: Java embedded RDBMS; not taught |
| 19 | [IMS DB Tutorial](#ims_db) | 1 | 19 | no: IBM hierarchical database; history only, see dbms-theory.md data models |
| 20 | [IndexedDB Tutorial](#indexeddb) | 2 | 21 | no: browser key-value store; the app itself uses it (snapshot, imports), not a learning topic |
| 21 | [MariaDB Tutorial](#mariadb) | 1 | 36 | no: MySQL fork; differences file covers MySQL-family dialect |
| 22 | [Memcached Tutorial](#memcached) | 4 | 23 | no: cache server; caching idea only appears with DynamoDB DAX (Engine dynamodb/L5/06-dax.md) |
| 23 | [Java & MySQL Tutorial](#java_mysql) | 8 | 35 | no: driver tutorial (JDBC); only the bind-parameter rule matters, security.md |
| 24 | [PHP & MongoDB Tutorial](#php_mongodb) | 3 | 20 | no: driver tutorial; not taught |
| 25 | [PHP & MySQL Tutorial](#php_mysql) | 3 | 24 | no: driver tutorial; only the bind-parameter rule matters, security.md |
| 26 | [MySQLi Tutorial](#mysqli) | 2 | 34 | no: PHP driver; only the bind-parameter rule matters, security.md |
| 27 | [Neo4j Tutorial](#neo4j) | 7 | 32 | no: graph database; closest BoonData topic is recursive CTE (adv a6) and DynamoDB adjacency lists |
| 28 | [OBIEE Tutorial](#obiee) | 1 | 27 | no: Oracle BI tool; BI tools are adv d2 (external link) |
| 29 | [OrientDB Tutorial](#orientdb) | 10 | 64 | no: multi-model database; not taught |
| 30 | [phpMyAdmin Tutorial](#phpmyadmin) | 3 | 22 | no: admin GUI; not taught |
| 31 | [PL/SQL Tutorial](#plsql) | 1 | 28 | no: Oracle procedural SQL; PostgreSQL equivalent PL/pgSQL is a gap, see proposal B4 |
| 32 | [PouchDB Tutorial](#pouchdb) | 1 | 23 | no: browser CouchDB clone; not taught |
| 33 | [Redis Tutorial](#redis) | 3 | 29 | no: key-value/cache server; not taught (possible future engine, not proposed) |
| 34 | [SQLAlchemy Tutorial](#sqlalchemy) | 3 | 40 | no: Python ORM; not taught (pandas reading is adv d5) |
| 35 | [T-SQL Tutorial](#t_sql) | 1 | 26 | no: SQL Server dialect; portable-SQL notes in mysql-sqlite-differences.md |
| 36 | [TinyDB Tutorial](#tinydb) | 2 | 34 | no: Python JSON document store; not taught |

## sql

SQL Tutorial · https://www.tutorialspoint.com/sql/index.htm · 122 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | SQL - Home | https://www.tutorialspoint.com/sql/index.htm | 16 |
| 2 | (no heading) | SQL - Roadmap | https://www.tutorialspoint.com/sql/sql-roadmap.htm | 30 |
| 3 | (no heading) | SQL - Overview | https://www.tutorialspoint.com/sql/sql-overview.htm | 4 |
| 4 | (no heading) | SQL - RDBMS Concepts | https://www.tutorialspoint.com/sql/sql-rdbms-concepts.htm | 9 |
| 5 | (no heading) | SQL - Databases | https://www.tutorialspoint.com/sql/sql-databases.htm | 13 |
| 6 | (no heading) | SQL - Syntax | https://www.tutorialspoint.com/sql/sql-syntax.htm | 29 |
| 7 | (no heading) | SQL - Data Types | https://www.tutorialspoint.com/sql/sql-data-types.htm | 10 |
| 8 | (no heading) | SQL - Operators | https://www.tutorialspoint.com/sql/sql-operators.htm | 7 |
| 9 | (no heading) | SQL - Expressions | https://www.tutorialspoint.com/sql/sql-expressions.htm | 18 |
| 10 | (no heading) | SQL - Comments | https://www.tutorialspoint.com/sql/sql-comments.htm | 11 |
| 11 | SQL Database | SQL - Create Database | https://www.tutorialspoint.com/sql/sql-create-database.htm | 16 |
| 12 | SQL Database | SQL - Drop Database | https://www.tutorialspoint.com/sql/sql-drop-database.htm | 12 |
| 13 | SQL Database | SQL - Select Database | https://www.tutorialspoint.com/sql/sql-select-database.htm | 7 |
| 14 | SQL Database | SQL - Rename Database | https://www.tutorialspoint.com/sql/sql-rename-database.htm | 12 |
| 15 | SQL Database | SQL - Show Databases | https://www.tutorialspoint.com/sql/sql-show-databases.htm | 10 |
| 16 | SQL Database | SQL - Backup Database | https://www.tutorialspoint.com/sql/sql-backup-database.htm | 11 |
| 17 | SQL Table | SQL - Create Table | https://www.tutorialspoint.com/sql/sql-create-table.htm | 14 |
| 18 | SQL Table | SQL - Show Tables | https://www.tutorialspoint.com/sql/sql-show-tables.htm | 12 |
| 19 | SQL Table | SQL - Rename Table | https://www.tutorialspoint.com/sql/sql-rename-table.htm | 14 |
| 20 | SQL Table | SQL - Truncate Table | https://www.tutorialspoint.com/sql/sql-truncate-table.htm | 7 |
| 21 | SQL Table | SQL - Clone Tables | https://www.tutorialspoint.com/sql/sql-clone-tables.htm | 21 |
| 22 | SQL Table | SQL - Temporary Tables | https://www.tutorialspoint.com/sql/sql-temporary-tables.htm | 15 |
| 23 | SQL Table | SQL - Alter Tables | https://www.tutorialspoint.com/sql/sql-alter-command.htm | 31 |
| 24 | SQL Table | SQL - Drop Table | https://www.tutorialspoint.com/sql/sql-drop-table.htm | 16 |
| 25 | SQL Table | SQL - Delete Table | https://www.tutorialspoint.com/sql/sql-delete-table.htm | 17 |
| 26 | SQL Table | SQL - Constraints | https://www.tutorialspoint.com/sql/sql-constraints.htm | 32 |
| 27 | SQL Queries | SQL - Insert Query | https://www.tutorialspoint.com/sql/sql-insert-query.htm | 17 |
| 28 | SQL Queries | SQL - Select Query | https://www.tutorialspoint.com/sql/sql-select-query.htm | 19 |
| 29 | SQL Queries | SQL - Select Into | https://www.tutorialspoint.com/sql/sql-select-into.htm | 18 |
| 30 | SQL Queries | SQL - Insert Into Select | https://www.tutorialspoint.com/sql/sql-insert-into-select.htm | 16 |
| 31 | SQL Queries | SQL - Update Query | https://www.tutorialspoint.com/sql/sql-update-query.htm | 17 |
| 32 | SQL Queries | SQL - Delete Query | https://www.tutorialspoint.com/sql/sql-delete-query.htm | 18 |
| 33 | SQL Queries | SQL - Sorting Results | https://www.tutorialspoint.com/sql/sql-sorting-results.htm | 10 |
| 34 | SQL Views | SQL - Create Views | https://www.tutorialspoint.com/sql/sql-create-view.htm | 20 |
| 35 | SQL Views | SQL - Update Views | https://www.tutorialspoint.com/sql/sql-update-view.htm | 14 |
| 36 | SQL Views | SQL - Drop Views | https://www.tutorialspoint.com/sql/sql-drop-view.htm | 17 |
| 37 | SQL Views | SQL - Rename Views | https://www.tutorialspoint.com/sql/sql-rename-view.htm | 10 |
| 38 | SQL Operators and Clauses | SQL - Where Clause | https://www.tutorialspoint.com/sql/sql-where-clause.htm | 28 |
| 39 | SQL Operators and Clauses | SQL - Top Clause | https://www.tutorialspoint.com/sql/sql-top-clause.htm | 21 |
| 40 | SQL Operators and Clauses | SQL - Distinct Clause | https://www.tutorialspoint.com/sql/sql-distinct-keyword.htm | 15 |
| 41 | SQL Operators and Clauses | SQL - Order By Clause | https://www.tutorialspoint.com/sql/sql-order-by.htm | 20 |
| 42 | SQL Operators and Clauses | SQL - Group By Clause | https://www.tutorialspoint.com/sql/sql-group-by.htm | 18 |
| 43 | SQL Operators and Clauses | SQL - Having Clause | https://www.tutorialspoint.com/sql/sql-having-clause.htm | 18 |
| 44 | SQL Operators and Clauses | SQL - AND & OR | https://www.tutorialspoint.com/sql/sql-and-or-clauses.htm | 27 |
| 45 | SQL Operators and Clauses | SQL - BOOLEAN (BIT) Operator | https://www.tutorialspoint.com/sql/sql-boolean-bit-operator.htm | 8 |
| 46 | SQL Operators and Clauses | SQL - LIKE Operator | https://www.tutorialspoint.com/sql/sql-like-clause.htm | 26 |
| 47 | SQL Operators and Clauses | SQL - IN Operator | https://www.tutorialspoint.com/sql/sql-in.htm | 20 |
| 48 | SQL Operators and Clauses | SQL - ANY, ALL Operators | https://www.tutorialspoint.com/sql/sql-any-all-operator.htm | 19 |
| 49 | SQL Operators and Clauses | SQL - EXISTS Operator | https://www.tutorialspoint.com/sql/sql-exists.htm | 22 |
| 50 | SQL Operators and Clauses | SQL - CASE | https://www.tutorialspoint.com/sql/sql-case.htm | 25 |
| 51 | SQL Operators and Clauses | SQL - NOT Operator | https://www.tutorialspoint.com/sql/sql-not.htm | 19 |
| 52 | SQL Operators and Clauses | SQL - NOT EQUAL | https://www.tutorialspoint.com/sql/sql-not-equal.htm | 12 |
| 53 | SQL Operators and Clauses | SQL - IS NULL | https://www.tutorialspoint.com/sql/sql-is-null.htm | 20 |
| 54 | SQL Operators and Clauses | SQL - IS NOT NULL | https://www.tutorialspoint.com/sql/sql-is-not-null.htm | 25 |
| 55 | SQL Operators and Clauses | SQL - NOT NULL | https://www.tutorialspoint.com/sql/sql-not-null-constraint.htm | 12 |
| 56 | SQL Operators and Clauses | SQL - BETWEEN Operator | https://www.tutorialspoint.com/sql/sql-between-operator.htm | 27 |
| 57 | SQL Operators and Clauses | SQL - UNION Operator | https://www.tutorialspoint.com/sql/sql-unions-operator.htm | 22 |
| 58 | SQL Operators and Clauses | SQL - UNION vs UNION ALL | https://www.tutorialspoint.com/sql/sql-union-vs-union-all.htm | 7 |
| 59 | SQL Operators and Clauses | SQL - INTERSECT Operator | https://www.tutorialspoint.com/sql/sql-intersect-clause.htm | 13 |
| 60 | SQL Operators and Clauses | SQL - EXCEPT Operator | https://www.tutorialspoint.com/sql/sql-except-clause.htm | 13 |
| 61 | SQL Operators and Clauses | SQL - Aliases | https://www.tutorialspoint.com/sql/sql-alias-syntax.htm | 20 |
| 62 | SQL Joins | SQL - Using Joins | https://www.tutorialspoint.com/sql/sql-using-joins.htm | 24 |
| 63 | SQL Joins | SQL - Inner Join | https://www.tutorialspoint.com/sql/sql-inner-joins.htm | 13 |
| 64 | SQL Joins | SQL - Left Join | https://www.tutorialspoint.com/sql/sql-left-joins.htm | 14 |
| 65 | SQL Joins | SQL - Right Join | https://www.tutorialspoint.com/sql/sql-right-joins.htm | 14 |
| 66 | SQL Joins | SQL - Cross Join | https://www.tutorialspoint.com/sql/sql-cross-join.htm | 11 |
| 67 | SQL Joins | SQL - Full Join | https://www.tutorialspoint.com/sql/sql-full-joins.htm | 12 |
| 68 | SQL Joins | SQL - Self Join | https://www.tutorialspoint.com/sql/sql-self-joins.htm | 12 |
| 69 | SQL Joins | SQL - Delete Join | https://www.tutorialspoint.com/sql/sql-delete-joins.htm | 8 |
| 70 | SQL Joins | SQL - Update Join | https://www.tutorialspoint.com/sql/sql-update-joins.htm | 21 |
| 71 | SQL Joins | SQL - Left Join vs Right Join | https://www.tutorialspoint.com/sql/sql-leftjoin-vs-rightjoin.htm | 8 |
| 72 | SQL Joins | SQL - Union vs Join | https://www.tutorialspoint.com/sql/sql-union-vs-join.htm | 8 |
| 73 | SQL Keys | SQL - Unique Key | https://www.tutorialspoint.com/sql/sql-unique-key.htm | 21 |
| 74 | SQL Keys | SQL - Primary Key | https://www.tutorialspoint.com/sql/sql-primary-key.htm | 16 |
| 75 | SQL Keys | SQL - Foreign Key | https://www.tutorialspoint.com/sql/sql-foreign-key.htm | 18 |
| 76 | SQL Keys | SQL - Composite Key | https://www.tutorialspoint.com/sql/sql-composite-key.htm | 16 |
| 77 | SQL Keys | SQL - Alternate Key | https://www.tutorialspoint.com/sql/sql-alternate-key.htm | 8 |
| 78 | SQL Indexes | SQL - Indexes | https://www.tutorialspoint.com/sql/sql-indexes.htm | 19 |
| 79 | SQL Indexes | SQL - Create Index | https://www.tutorialspoint.com/sql/sql-create-index.htm | 18 |
| 80 | SQL Indexes | SQL - Drop Index | https://www.tutorialspoint.com/sql/sql-drop-index.htm | 17 |
| 81 | SQL Indexes | SQL - Show Indexes | https://www.tutorialspoint.com/sql/sql-show-indexes.htm | 8 |
| 82 | SQL Indexes | SQL - Unique Index | https://www.tutorialspoint.com/sql/sql-unique-index.htm | 12 |
| 83 | SQL Indexes | SQL - Clustered Index | https://www.tutorialspoint.com/sql/sql-clustered-index.htm | 8 |
| 84 | SQL Indexes | SQL - Non-Clustered Index | https://www.tutorialspoint.com/sql/sql-non-clustered-index.htm | 8 |
| 85 | Advanced SQL | SQL - Wildcards | https://www.tutorialspoint.com/sql/sql-wildcards.htm | 20 |
| 86 | Advanced SQL | SQL - Data Types | https://www.tutorialspoint.com/sql/sql-data-types.htm | 10 |
| 87 | Advanced SQL | SQL - Injection | https://www.tutorialspoint.com/sql/sql-injection.htm | 7 |
| 88 | Advanced SQL | SQL - Hosting | https://www.tutorialspoint.com/sql/sql-hosting.htm | 5 |
| 89 | Advanced SQL | SQL - Min & Max | https://www.tutorialspoint.com/sql/sql-min-and-max.htm | 14 |
| 90 | Advanced SQL | SQL - Null Functions | https://www.tutorialspoint.com/sql/sql-null-functions.htm | 19 |
| 91 | Advanced SQL | SQL - Check Constraint | https://www.tutorialspoint.com/sql/sql-check-constraint.htm | 25 |
| 92 | Advanced SQL | SQL - Default Constraint | https://www.tutorialspoint.com/sql/sql-default-constraint.htm | 13 |
| 93 | Advanced SQL | SQL - Stored Procedures | https://www.tutorialspoint.com/sql/sql-stored-procedures.htm | 21 |
| 94 | Advanced SQL | SQL - NULL Values | https://www.tutorialspoint.com/sql/sql-null-values.htm | 11 |
| 95 | Advanced SQL | SQL - Transactions | https://www.tutorialspoint.com/sql/sql-transactions.htm | 15 |
| 96 | Advanced SQL | SQL - Sub Queries | https://www.tutorialspoint.com/sql/sql-sub-queries.htm | 13 |
| 97 | Advanced SQL | SQL - Handling Duplicates | https://www.tutorialspoint.com/sql/sql-handling-duplicates.htm | 6 |
| 98 | Advanced SQL | SQL - Using Sequences | https://www.tutorialspoint.com/sql/sql-using-sequences.htm | 10 |
| 99 | Advanced SQL | SQL - Auto Increment | https://www.tutorialspoint.com/sql/sql-auto-increment.htm | 11 |
| 100 | Advanced SQL | SQL - Date & Time | https://www.tutorialspoint.com/sql/sql-date-and-time.htm | 10 |
| 101 | Advanced SQL | SQL - Cursors | https://www.tutorialspoint.com/sql/sql-cursors.htm | 13 |
| 102 | Advanced SQL | SQL - Common Table Expression | https://www.tutorialspoint.com/sql/sql-common-table-expression.htm | 16 |
| 103 | Advanced SQL | SQL - Group By vs Order By | https://www.tutorialspoint.com/sql/sql-group-by-vs-order-by.htm | 13 |
| 104 | Advanced SQL | SQL - IN vs EXISTS | https://www.tutorialspoint.com/sql/sql-in-vs-exists.htm | 9 |
| 105 | Advanced SQL | SQL - Database Tuning | https://www.tutorialspoint.com/sql/sql-database-tuning.htm | 7 |
| 106 | SQL Function Reference | SQL - Date Functions | https://www.tutorialspoint.com/sql/sql-date-functions.htm | 0 |
| 107 | SQL Function Reference | SQL - String Functions | https://www.tutorialspoint.com/sql/sql-string-functions.htm | 0 |
| 108 | SQL Function Reference | SQL - Aggregate Functions | https://www.tutorialspoint.com/sql/sql-aggregate-functions.htm | 0 |
| 109 | SQL Function Reference | SQL - Numeric Functions | https://www.tutorialspoint.com/sql/sql-numeric-functions.htm | 0 |
| 110 | SQL Function Reference | SQL - Text & Image Functions | https://www.tutorialspoint.com/sql/sql-text-image-functions.htm | 0 |
| 111 | SQL Function Reference | SQL - Statistical Functions | https://www.tutorialspoint.com/sql/sql-statistical-functions.htm | 0 |
| 112 | SQL Function Reference | SQL - Logical Functions | https://www.tutorialspoint.com/sql/sql-logical-funtions.htm | 0 |
| 113 | SQL Function Reference | SQL - Cursor Functions | https://www.tutorialspoint.com/sql/sql-cursor-functions.htm | 1 |
| 114 | SQL Function Reference | SQL - JSON Functions | https://www.tutorialspoint.com/sql/sql-json-functions.htm | 1 |
| 115 | SQL Function Reference | SQL - Conversion Functions | https://www.tutorialspoint.com/sql/sql-conversion-functions.htm | 1 |
| 116 | SQL Function Reference | SQL - Datatype Functions | https://www.tutorialspoint.com/sql/sql-datatype-functions.htm | 0 |
| 117 | SQL Useful Resources | SQL - Questions and Answers | https://www.tutorialspoint.com/sql/sql_questions_answers.htm | 0 |
| 118 | SQL Useful Resources | SQL - Cheatsheet | https://www.tutorialspoint.com/sql/sql_cheatsheet.htm | 47 |
| 119 | SQL Useful Resources | SQL - Quick Guide | https://www.tutorialspoint.com/sql/sql-quick-guide.htm | 234 |
| 120 | SQL Useful Resources | SQL - Useful Functions | https://www.tutorialspoint.com/sql/sql-useful-functions.htm | 0 |
| 121 | SQL Useful Resources | SQL - Useful Resources | https://www.tutorialspoint.com/sql/sql-useful-resources.htm | 0 |
| 122 | SQL Useful Resources | SQL - Discussion | https://www.tutorialspoint.com/sql/sql-discussion.htm | 0 |

## postgresql

PostgreSQL Tutorial · https://www.tutorialspoint.com/postgresql/index.htm · 90 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | PostgreSQL - Home | https://www.tutorialspoint.com/postgresql/index.htm | 7 |
| 2 | (no heading) | PostgreSQL - Overview | https://www.tutorialspoint.com/postgresql/postgresql_overview.htm | 4 |
| 3 | (no heading) | PostgreSQL - Environment Setup | https://www.tutorialspoint.com/postgresql/postgresql_environment.htm | 3 |
| 4 | (no heading) | PostgreSQL - Syntax | https://www.tutorialspoint.com/postgresql/postgresql_syntax.htm | 104 |
| 5 | (no heading) | PostgreSQL - Data Types | https://www.tutorialspoint.com/postgresql/postgresql_data_types.htm | 27 |
| 6 | (no heading) | PostgreSQL - Operators | https://www.tutorialspoint.com/postgresql/postgresql_operators.htm | 5 |
| 7 | (no heading) | PostgreSQL - Expressions | https://www.tutorialspoint.com/postgresql/postgresql_expressions.htm | 4 |
| 8 | PostgreSQL Database | PostgreSQL - Create Database | https://www.tutorialspoint.com/postgresql/postgresql_create_database.htm | 7 |
| 9 | PostgreSQL Database | PostgreSQL - ALTER DATABASE | https://www.tutorialspoint.com/postgresql/postgresql_alter_database.htm | 6 |
| 10 | PostgreSQL Database | PostgreSQL - Drop Database | https://www.tutorialspoint.com/postgresql/postgresql_drop_database.htm | 9 |
| 11 | PostgreSQL Database | PostgreSQL - Loading Database | https://www.tutorialspoint.com/postgresql/postgresql_loading_database.htm | 6 |
| 12 | PostgreSQL Database | PostgreSQL - Rename Database | https://www.tutorialspoint.com/postgresql/postgresql_rename_database.htm | 3 |
| 13 | PostgreSQL Database | PostgreSQL - Select Database | https://www.tutorialspoint.com/postgresql/postgresql_select_database.htm | 2 |
| 14 | PostgreSQL Database | PostgreSQL - Show Database | https://www.tutorialspoint.com/postgresql/postgresql_show_database.htm | 3 |
| 15 | PostgreSQL Query Operations | PostgreSQL - SELECT | https://www.tutorialspoint.com/postgresql/postgresql_select_query.htm | 2 |
| 16 | PostgreSQL Query Operations | PostgreSQL - CREATE | https://www.tutorialspoint.com/postgresql/postgresql_create_table.htm | 2 |
| 17 | PostgreSQL Query Operations | PostgreSQL - INSERT | https://www.tutorialspoint.com/postgresql/postgresql_insert_query.htm | 3 |
| 18 | PostgreSQL Query Operations | PostgreSQL - UPDATE | https://www.tutorialspoint.com/postgresql/postgresql_update_query.htm | 2 |
| 19 | PostgreSQL Query Operations | PostgreSQL - DELETE | https://www.tutorialspoint.com/postgresql/postgresql_delete_query.htm | 3 |
| 20 | PostgreSQL Query Operations | PostgreSQL - ALTER TABLE Command | https://www.tutorialspoint.com/postgresql/postgresql_alter_command.htm | 2 |
| 21 | PostgreSQL Query Operations | PostgreSQL - WHERE Clause | https://www.tutorialspoint.com/postgresql/postgresql_where_clause.htm | 2 |
| 22 | PostgreSQL Query Operations | PostgreSQL - ORDER BY Clause | https://www.tutorialspoint.com/postgresql/postgresql_order_by.htm | 2 |
| 23 | PostgreSQL Query Operations | PostgreSQL - GROUP BY | https://www.tutorialspoint.com/postgresql/postgresql_group_by.htm | 2 |
| 24 | PostgreSQL Query Operations | PostgreSQL - HAVING Clause | https://www.tutorialspoint.com/postgresql/postgresql_having_clause.htm | 2 |
| 25 | PostgreSQL Query Operations | PostgreSQL - DISTINCT Keyword | https://www.tutorialspoint.com/postgresql/postgresql_distinct_keyword.htm | 2 |
| 26 | PostgreSQL Query Operations | PostgreSQL - LIMIT Clause | https://www.tutorialspoint.com/postgresql/postgresql_limit_clause.htm | 2 |
| 27 | PostgreSQL Query Operations | PostgreSQL - LIKE Clause | https://www.tutorialspoint.com/postgresql/postgresql_like_clause.htm | 2 |
| 28 | PostgreSQL Query Operations | PostgreSQL - WITH Clause | https://www.tutorialspoint.com/postgresql/postgresql_with_clause.htm | 3 |
| 29 | PostgreSQL Query Operations | PostgreSQL - AND & OR Clauses | https://www.tutorialspoint.com/postgresql/postgresql_and_or_clauses.htm | 6 |
| 30 | PostgreSQL Query Operations | PostgreSQL - DROP TABLE | https://www.tutorialspoint.com/postgresql/postgresql_drop_table.htm | 2 |
| 31 | PostgreSQL Query Operations | PostgreSQL - Upsert | https://www.tutorialspoint.com/postgresql/postgresql_upsert.htm | 8 |
| 32 | PostgreSQL Query Operations | TRUNCATE TABLE Command | https://www.tutorialspoint.com/postgresql/postgresql_truncate_table.htm | 2 |
| 33 | PostgreSQL JOINS & Schemas | PostgreSQL Schemas | https://www.tutorialspoint.com/postgresql/postgresql_schema.htm | 6 |
| 34 | PostgreSQL JOINS & Schemas | PostgreSQL Joins | https://www.tutorialspoint.com/postgresql/postgresql_using_joins.htm | 15 |
| 35 | PostgreSQL Data Integrity & Transaction | PostgreSQL - Constraints | https://www.tutorialspoint.com/postgresql/postgresql_constraints.htm | 13 |
| 36 | PostgreSQL Data Integrity & Transaction | PostgreSQL - Transactions | https://www.tutorialspoint.com/postgresql/postgresql_transactions.htm | 9 |
| 37 | PostgreSQL Data Integrity & Transaction | PostgreSQL - Commit | https://www.tutorialspoint.com/postgresql/postgresql_commit.htm | 8 |
| 38 | PostgreSQL Data Integrity & Transaction | PostgreSQL - Rollback | https://www.tutorialspoint.com/postgresql/postgresql_rollback.htm | 5 |
| 39 | PostgreSQL Data Integrity & Transaction | PostgreSQL - Views | https://www.tutorialspoint.com/postgresql/postgresql_views.htm | 4 |
| 40 | PostgreSQL Functions | PostgreSQL - ALIAS Syntax | https://www.tutorialspoint.com/postgresql/postgresql_alias_syntax.htm | 2 |
| 41 | PostgreSQL Functions | PostgreSQL - Functions | https://www.tutorialspoint.com/postgresql/postgresql_functions.htm | 2 |
| 42 | PostgreSQL Functions | PostgreSQL - Function Overloading | https://www.tutorialspoint.com/postgresql/postgresql_functions_overloading.htm | 404 |
| 43 | PostgreSQL Functions | PostgreSQL - Useful Function | https://www.tutorialspoint.com/postgresql/postgresql_useful_functions.htm | 0 |
| 44 | PostgreSQL Functions | PostgreSQL - DROP FUNCTION | https://www.tutorialspoint.com/postgresql/postgresql_drop_function.htm | 404 |
| 45 | PostgreSQL Functions | PostgreSQL - MAX() Function | https://www.tutorialspoint.com/postgresql/postgresql_max_function.htm | 0 |
| 46 | PostgreSQL Functions | PostgreSQL - MIN() Function | https://www.tutorialspoint.com/postgresql/postgresql_min_function.htm | 0 |
| 47 | PostgreSQL Functions | PostgreSQL - SUM() Function | https://www.tutorialspoint.com/postgresql/postgresql_sum_function.htm | 0 |
| 48 | PostgreSQL Functions | PostgreSQL - COUNT() Function | https://www.tutorialspoint.com/postgresql/postgresql_count_function.htm | 0 |
| 49 | PostgreSQL Functions | PostgreSQL - Array Function | https://www.tutorialspoint.com/postgresql/postgresql_array_functions.htm | 0 |
| 50 | PostgreSQL Functions | PostgreSQL - String Function | https://www.tutorialspoint.com/postgresql/postgresql_string_functions.htm | 26 |
| 51 | PostgreSQL Functions | PostgreSQL - Numeric Function | https://www.tutorialspoint.com/postgresql/postgresql_numeric_functions.htm | 23 |
| 52 | PostgreSQL Functions | PostgreSQL - EXTRACT() Function | https://www.tutorialspoint.com/postgresql/postgresql_extract_function.htm | 404 |
| 53 | PostgreSQL Functions | PostgreSQL - REPLACE() Function | https://www.tutorialspoint.com/postgresql/postgresql_replace_function.htm | 404 |
| 54 | PostgreSQL Role & Permission | PostgreSQL - CREATE ROLE | https://www.tutorialspoint.com/postgresql/postgresql_create_role.htm | 404 |
| 55 | PostgreSQL Role & Permission | PostgreSQL - ALTER ROLE | https://www.tutorialspoint.com/postgresql/postgresql_alter_role.htm | 404 |
| 56 | PostgreSQL Role & Permission | PostgreSQL - DROP ROLE | https://www.tutorialspoint.com/postgresql/postgresql_drop_role.htm | 404 |
| 57 | PostgreSQL Role & Permission | PostgreSQL - GRANT | https://www.tutorialspoint.com/postgresql/postgresql_grant.htm | 404 |
| 58 | PostgreSQL Role & Permission | PostgreSQL - REVOKE | https://www.tutorialspoint.com/postgresql/postgresql_revoke.htm | 404 |
| 59 | PostgreSQL Role & Permission | PostgreSQL - Role Membership | https://www.tutorialspoint.com/postgresql/postgresql_role_membership.htm | 404 |
| 60 | PostgreSQL Operators | PostgreSQL - UNION Operator | https://www.tutorialspoint.com/postgresql/postgresql_unions_clause.htm | 8 |
| 61 | PostgreSQL Operators | PostgreSQL - EXCEPT Operator | https://www.tutorialspoint.com/postgresql/postgresql_except_operator.htm | 3 |
| 62 | PostgreSQL Operators | PostgreSQL - ANY Operator | https://www.tutorialspoint.com/postgresql/postgresql_any_operator.htm | 2 |
| 63 | PostgreSQL Operators | PostgreSQL - ALL Operator | https://www.tutorialspoint.com/postgresql/postgresql_all_operator.htm | 2 |
| 64 | PostgreSQL Operators | PostgreSQL - EXISTS Operator | https://www.tutorialspoint.com/postgresql/postgresql_exists_operator.htm | 6 |
| 65 | PostgreSQL Operators | PostgreSQL - INTERSECT Operator | https://www.tutorialspoint.com/postgresql/postgresql_intersect_operator.htm | 404 |
| 66 | PostgreSQL Operators | PostgreSQL - EXCEPT Operator | https://www.tutorialspoint.com/postgresql/postgresql_except_operator.htm | 3 |
| 67 | PostgreSQL Operators | PostgreSQL - ANY Operator | https://www.tutorialspoint.com/postgresql/postgresql_any_operator.htm | 2 |
| 68 | PostgreSQL Operators | PostgreSQL - ALL Operator | https://www.tutorialspoint.com/postgresql/postgresql_all_operator.htm | 2 |
| 69 | PostgreSQL Operators | PostgreSQL - EXISTS Operator | https://www.tutorialspoint.com/postgresql/postgresql_exists_operator.htm | 6 |
| 70 | PostgreSQL Interface | PostgreSQL - C / C++ | https://www.tutorialspoint.com/postgresql/postgresql_c_cpp.htm | 8 |
| 71 | PostgreSQL Interface | PostgreSQL - Java | https://www.tutorialspoint.com/postgresql/postgresql_java.htm | 7 |
| 72 | PostgreSQL Interface | PostgreSQL - PHP | https://www.tutorialspoint.com/postgresql/postgresql_php.htm | 8 |
| 73 | PostgreSQL Interface | PostgreSQL - Perl | https://www.tutorialspoint.com/postgresql/postgresql_perl.htm | 8 |
| 74 | PostgreSQL Interface | PostgreSQL - Python | https://www.tutorialspoint.com/postgresql/postgresql_python.htm | 8 |
| 75 | PostgreSQL Error & Exception | PostgreSQL - Error and Message | https://www.tutorialspoint.com/postgresql/postgresql_error_and_message.htm | 404 |
| 76 | PostgreSQL Error & Exception | PostgreSQL - Assert | https://www.tutorialspoint.com/postgresql/postgresql_assert.htm | 6 |
| 77 | Advanced PostgreSQL | PostgreSQL - NULL Values | https://www.tutorialspoint.com/postgresql/postgresql_null_values.htm | 2 |
| 78 | Advanced PostgreSQL | PostgreSQL - Triggers | https://www.tutorialspoint.com/postgresql/postgresql_triggers.htm | 4 |
| 79 | Advanced PostgreSQL | PostgreSQL - Indexes | https://www.tutorialspoint.com/postgresql/postgresql_indexes.htm | 10 |
| 80 | Advanced PostgreSQL | PostgreSQL - Locks | https://www.tutorialspoint.com/postgresql/postgresql_locks.htm | 4 |
| 81 | Advanced PostgreSQL | PostgreSQL - Sub Queries | https://www.tutorialspoint.com/postgresql/postgresql_sub_queries.htm | 8 |
| 82 | Advanced PostgreSQL | PostgreSQL - Auto Increment | https://www.tutorialspoint.com/postgresql/postgresql_using_autoincrement.htm | 2 |
| 83 | Advanced PostgreSQL | PostgreSQL - Privileges | https://www.tutorialspoint.com/postgresql/postgresql_privileges.htm | 3 |
| 84 | Advanced PostgreSQL | PostgreSQL - Date/Time Functions & Operators | https://www.tutorialspoint.com/postgresql/postgresql_date_time.htm | 6 |
| 85 | Advanced PostgreSQL | PostgreSQL - Errors & Messages | https://www.tutorialspoint.com/postgresql/postgresql_errors_and_messages.htm | 10 |
| 86 | Advanced PostgreSQL | PostgreSQL - Assert | https://www.tutorialspoint.com/postgresql/postgresql_assert.htm | 6 |
| 87 | Advanced PostgreSQL | PostgreSQL - Quick Guide | https://www.tutorialspoint.com/postgresql/postgresql_quick_guide.htm | 324 |
| 88 | Advanced PostgreSQL | PostgreSQL - Cheatsheet | https://www.tutorialspoint.com/postgresql/postgresql_cheatsheet.htm | 39 |
| 89 | Advanced PostgreSQL | PostgreSQL - Useful Resources | https://www.tutorialspoint.com/postgresql/postgresql_useful_resources.htm | 0 |
| 90 | Advanced PostgreSQL | PostgreSQL - Discussion | https://www.tutorialspoint.com/postgresql/postgresql_discussion.htm | 0 |

## mysql

MySQL Tutorial · https://www.tutorialspoint.com/mysql/index.htm · 186 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | MySQL - Home | https://www.tutorialspoint.com/mysql/index.htm | 8 |
| 2 | (no heading) | MySQL - Introduction | https://www.tutorialspoint.com/mysql/mysql-introduction.htm | 5 |
| 3 | (no heading) | MySQL - Features | https://www.tutorialspoint.com/mysql/mysql-features.htm | 11 |
| 4 | (no heading) | MySQL - Versions | https://www.tutorialspoint.com/mysql/mysql-versions.htm | 8 |
| 5 | (no heading) | MySQL - Variables | https://www.tutorialspoint.com/mysql/mysql-variables.htm | 16 |
| 6 | (no heading) | MySQL - Installation | https://www.tutorialspoint.com/mysql/mysql-installation.htm | 2 |
| 7 | (no heading) | MySQL - Administration | https://www.tutorialspoint.com/mysql/mysql-administration.htm | 5 |
| 8 | (no heading) | MySQL - PHP Syntax | https://www.tutorialspoint.com/mysql/mysql-php-syntax.htm | 4 |
| 9 | (no heading) | MySQL - Node.js Syntax | https://www.tutorialspoint.com/mysql/mysql-nodejs-syntax.htm | 3 |
| 10 | (no heading) | MySQL - Java Syntax | https://www.tutorialspoint.com/mysql/mysql-java-syntax.htm | 3 |
| 11 | (no heading) | MySQL - Python Syntax | https://www.tutorialspoint.com/mysql/mysql-python-syntax.htm | 3 |
| 12 | (no heading) | MySQL - Connection | https://www.tutorialspoint.com/mysql/mysql-connection.htm | 10 |
| 13 | (no heading) | MySQL - Workbench | https://www.tutorialspoint.com/mysql/mysql-workbench.htm | 24 |
| 14 | MySQL Databases | MySQL - Create Database | https://www.tutorialspoint.com/mysql/mysql-create-database.htm | 14 |
| 15 | MySQL Databases | MySQL - Drop Database | https://www.tutorialspoint.com/mysql/mysql-drop-database.htm | 15 |
| 16 | MySQL Databases | MySQL - Select Database | https://www.tutorialspoint.com/mysql/mysql-select-database.htm | 13 |
| 17 | MySQL Databases | MySQL - Show Database | https://www.tutorialspoint.com/mysql/mysql_show_databases_statement.htm | 15 |
| 18 | MySQL Databases | MySQL - Copy Database | https://www.tutorialspoint.com/mysql/mysql-copy-database.htm | 7 |
| 19 | MySQL Databases | MySQL - Database Export | https://www.tutorialspoint.com/mysql/mysql-database-export.htm | 6 |
| 20 | MySQL Databases | MySQL - Database Import | https://www.tutorialspoint.com/mysql/mysql-database-import.htm | 4 |
| 21 | MySQL Databases | MySQL - Database Info | https://www.tutorialspoint.com/mysql/mysql-database-info.htm | 19 |
| 22 | MySQL Users | MySQL - Create Users | https://www.tutorialspoint.com/mysql/mysql_create_user_statement.htm | 31 |
| 23 | MySQL Users | MySQL - Drop Users | https://www.tutorialspoint.com/mysql/mysql_drop_user_statement.htm | 15 |
| 24 | MySQL Users | MySQL - Show Users | https://www.tutorialspoint.com/mysql/mysql-show-users.htm | 22 |
| 25 | MySQL Users | MySQL - Change Password | https://www.tutorialspoint.com/mysql/mysql-change-user-password.htm | 19 |
| 26 | MySQL Users | MySQL - Grant Privileges | https://www.tutorialspoint.com/mysql/mysql_grant_statement.htm | 34 |
| 27 | MySQL Users | MySQL - Show Privileges | https://www.tutorialspoint.com/mysql/mysql_show_privileges_statement.htm | 11 |
| 28 | MySQL Users | MySQL - Revoke Privileges | https://www.tutorialspoint.com/mysql/mysql_revoke_statement.htm | 19 |
| 29 | MySQL Users | MySQL - Lock User Account | https://www.tutorialspoint.com/mysql/mysql-lock-users.htm | 18 |
| 30 | MySQL Users | MySQL - Unlock User Account | https://www.tutorialspoint.com/mysql/mysql-unlock-users.htm | 21 |
| 31 | MySQL Tables | MySQL - Create Tables | https://www.tutorialspoint.com/mysql/mysql-create-tables.htm | 22 |
| 32 | MySQL Tables | MySQL - Show Tables | https://www.tutorialspoint.com/mysql/mysql-show-tables.htm | 26 |
| 33 | MySQL Tables | MySQL - Alter Tables | https://www.tutorialspoint.com/mysql/mysql-alter-command.htm | 44 |
| 34 | MySQL Tables | MySQL - Rename Tables | https://www.tutorialspoint.com/mysql/mysql_rename_table.htm | 22 |
| 35 | MySQL Tables | MySQL - Clone Tables | https://www.tutorialspoint.com/mysql/mysql-clone-tables.htm | 24 |
| 36 | MySQL Tables | MySQL - Truncate Tables | https://www.tutorialspoint.com/mysql/mysql_truncate_table.htm | 14 |
| 37 | MySQL Tables | MySQL - Temporary Tables | https://www.tutorialspoint.com/mysql/mysql-temporary-tables.htm | 16 |
| 38 | MySQL Tables | MySQL - Repair Tables | https://www.tutorialspoint.com/mysql/mysql_repair_table_statement.htm | 17 |
| 39 | MySQL Tables | MySQL - Describe Tables | https://www.tutorialspoint.com/mysql/mysql_describe_statement.htm | 32 |
| 40 | MySQL Tables | MySQL - Add/Delete Columns | https://www.tutorialspoint.com/mysql/mysql-add-delete-columns.htm | 29 |
| 41 | MySQL Tables | MySQL - Show Columns | https://www.tutorialspoint.com/mysql/mysql_show_columns_statement.htm | 25 |
| 42 | MySQL Tables | MySQL - Rename Columns | https://www.tutorialspoint.com/mysql/mysql-rename-columns.htm | 23 |
| 43 | MySQL Tables | MySQL - Table Locking | https://www.tutorialspoint.com/mysql/mysql_lock_tables.htm | 13 |
| 44 | MySQL Tables | MySQL - Drop Tables | https://www.tutorialspoint.com/mysql/mysql-drop-tables.htm | 18 |
| 45 | MySQL Tables | MySQL - Derived Tables | https://www.tutorialspoint.com/mysql/mysql-derived-tables.htm | 20 |
| 46 | MySQL Queries | MySQL - Queries | https://www.tutorialspoint.com/mysql/mysql-queries.htm | 27 |
| 47 | MySQL Queries | MySQL - Constraints | https://www.tutorialspoint.com/mysql/mysql-constraints.htm | 19 |
| 48 | MySQL Queries | MySQL - Insert Query | https://www.tutorialspoint.com/mysql/mysql-insert-query.htm | 23 |
| 49 | MySQL Queries | MySQL - Select Query | https://www.tutorialspoint.com/mysql/mysql-select-query.htm | 16 |
| 50 | MySQL Queries | MySQL - Update Query | https://www.tutorialspoint.com/mysql/mysql-update-query.htm | 17 |
| 51 | MySQL Queries | MySQL - Delete Query | https://www.tutorialspoint.com/mysql/mysql-delete-query.htm | 19 |
| 52 | MySQL Queries | MySQL - Replace Query | https://www.tutorialspoint.com/mysql/mysql_replace.htm | 16 |
| 53 | MySQL Queries | MySQL - Insert Ignore | https://www.tutorialspoint.com/mysql/mysql-insert-ignore.htm | 16 |
| 54 | MySQL Queries | MySQL - Insert on Duplicate Key Update | https://www.tutorialspoint.com/mysql/mysql-insert-on-duplicate-update.htm | 19 |
| 55 | MySQL Queries | MySQL - Insert Into Select | https://www.tutorialspoint.com/mysql/mysql-insert-into-select.htm | 21 |
| 56 | MySQL Views | MySQL - Create Views | https://www.tutorialspoint.com/mysql/mysql_create_view.htm | 16 |
| 57 | MySQL Views | MySQL - Update Views | https://www.tutorialspoint.com/mysql/mysql-update-views.htm | 18 |
| 58 | MySQL Views | MySQL - Drop Views | https://www.tutorialspoint.com/mysql/mysql_drop_view.htm | 15 |
| 59 | MySQL Views | MySQL - Rename Views | https://www.tutorialspoint.com/mysql/mysql-rename-views.htm | 12 |
| 60 | MySQL Indexes | MySQL - Indexes | https://www.tutorialspoint.com/mysql/mysql-indexes.htm | 6 |
| 61 | MySQL Indexes | MySQL - Create Index | https://www.tutorialspoint.com/mysql/mysql_create_index.htm | 20 |
| 62 | MySQL Indexes | MySQL - Drop Index | https://www.tutorialspoint.com/mysql/mysql_drop_index.htm | 19 |
| 63 | MySQL Indexes | MySQL - Show Indexes | https://www.tutorialspoint.com/mysql/mysql_show_index_statement.htm | 15 |
| 64 | MySQL Indexes | MySQL - Unique Index | https://www.tutorialspoint.com/mysql/mysql-unique-index.htm | 15 |
| 65 | MySQL Indexes | MySQL - Clustered Index | https://www.tutorialspoint.com/mysql/mysql-clustered-index.htm | 3 |
| 66 | MySQL Indexes | MySQL - Non-Clustered Index | https://www.tutorialspoint.com/mysql/mysql-non-clustered-index.htm | 8 |
| 67 | MySQL Operators and Clauses | MySQL - Where Clause | https://www.tutorialspoint.com/mysql/mysql-where-clause.htm | 13 |
| 68 | MySQL Operators and Clauses | MySQL - Limit Clause | https://www.tutorialspoint.com/mysql/mysql-limit-clause.htm | 25 |
| 69 | MySQL Operators and Clauses | MySQL - Distinct Clause | https://www.tutorialspoint.com/mysql/mysql-distinct-clause.htm | 22 |
| 70 | MySQL Operators and Clauses | MySQL - Order By Clause | https://www.tutorialspoint.com/mysql/mysql-order-by-clause.htm | 23 |
| 71 | MySQL Operators and Clauses | MySQL - Group By Clause | https://www.tutorialspoint.com/mysql/mysql-group-by-clause.htm | 25 |
| 72 | MySQL Operators and Clauses | MySQL - Having Clause | https://www.tutorialspoint.com/mysql/mysql-having-clause.htm | 22 |
| 73 | MySQL Operators and Clauses | MySQL - AND Operator | https://www.tutorialspoint.com/mysql/mysql-and-operator.htm | 34 |
| 74 | MySQL Operators and Clauses | MySQL - OR Operator | https://www.tutorialspoint.com/mysql/mysql-or-operator.htm | 34 |
| 75 | MySQL Operators and Clauses | MySQL - Like Operator | https://www.tutorialspoint.com/mysql/mysql-like-clause.htm | 21 |
| 76 | MySQL Operators and Clauses | MySQL - IN Operator | https://www.tutorialspoint.com/mysql/mysql-in-clause.htm | 25 |
| 77 | MySQL Operators and Clauses | MySQL - ANY Operator | https://www.tutorialspoint.com/mysql/mysql-any-operator.htm | 28 |
| 78 | MySQL Operators and Clauses | MySQL - EXISTS Operator | https://www.tutorialspoint.com/mysql/mysql-exists-operator.htm | 26 |
| 79 | MySQL Operators and Clauses | MySQL - NOT Operator | https://www.tutorialspoint.com/mysql/mysql-not-operator.htm | 35 |
| 80 | MySQL Operators and Clauses | MySQL - NOT EQUAL Operator | https://www.tutorialspoint.com/mysql/mysql-not-equal.htm | 22 |
| 81 | MySQL Operators and Clauses | MySQL - IS NULL Operator | https://www.tutorialspoint.com/mysql/mysql-is-null.htm | 25 |
| 82 | MySQL Operators and Clauses | MySQL - IS NOT NULL Operator | https://www.tutorialspoint.com/mysql/mysql-is-not-null.htm | 24 |
| 83 | MySQL Operators and Clauses | MySQL - Between Operator | https://www.tutorialspoint.com/mysql/mysql-between-clause.htm | 28 |
| 84 | MySQL Operators and Clauses | MySQL - UNION Operator | https://www.tutorialspoint.com/mysql/mysql-union-keyword.htm | 25 |
| 85 | MySQL Operators and Clauses | MySQL - UNION vs UNION ALL | https://www.tutorialspoint.com/mysql/mysql-union-vs-union-all.htm | 10 |
| 86 | MySQL Operators and Clauses | MySQL - MINUS Operator | https://www.tutorialspoint.com/mysql/mysql-minus.htm | 11 |
| 87 | MySQL Operators and Clauses | MySQL - INTERSECT Operator | https://www.tutorialspoint.com/mysql/mysql-intersect.htm | 20 |
| 88 | MySQL Operators and Clauses | MySQL - INTERVAL Operator | https://www.tutorialspoint.com/mysql/mysql-interval.htm | 23 |
| 89 | MySQL Joins | MySQL - Using Joins | https://www.tutorialspoint.com/mysql/mysql-using-joins.htm | 10 |
| 90 | MySQL Joins | MySQL - Inner Join | https://www.tutorialspoint.com/mysql/mysql-inner-join.htm | 19 |
| 91 | MySQL Joins | MySQL - Left Join | https://www.tutorialspoint.com/mysql/mysql-left-join.htm | 19 |
| 92 | MySQL Joins | MySQL - Right Join | https://www.tutorialspoint.com/mysql/mysql-right-join.htm | 19 |
| 93 | MySQL Joins | MySQL - Cross Join | https://www.tutorialspoint.com/mysql/mysql-cross-join.htm | 15 |
| 94 | MySQL Joins | MySQL - Full Join | https://www.tutorialspoint.com/mysql/mysql-full-join.htm | 8 |
| 95 | MySQL Joins | MySQL - Self Join | https://www.tutorialspoint.com/mysql/mysql-self-join.htm | 14 |
| 96 | MySQL Joins | MySQL - Delete Join | https://www.tutorialspoint.com/mysql/mysql-delete-join.htm | 13 |
| 97 | MySQL Joins | MySQL - Update Join | https://www.tutorialspoint.com/mysql/mysql-update-join.htm | 14 |
| 98 | MySQL Joins | MySQL - Union vs Join | https://www.tutorialspoint.com/mysql/mysql-union-vs-join.htm | 9 |
| 99 | MySQL Keys | MySQL - Unique Key | https://www.tutorialspoint.com/mysql/mysql-unique-key.htm | 23 |
| 100 | MySQL Keys | MySQL - Primary Key | https://www.tutorialspoint.com/mysql/mysql-primary-key.htm | 20 |
| 101 | MySQL Keys | MySQL - Foreign Key | https://www.tutorialspoint.com/mysql/mysql-foreign-key.htm | 21 |
| 102 | MySQL Keys | MySQL - Composite Key | https://www.tutorialspoint.com/mysql/mysql-composite-key.htm | 15 |
| 103 | MySQL Keys | MySQL - Alternate Key | https://www.tutorialspoint.com/mysql/mysql-alternate-key.htm | 11 |
| 104 | MySQL Triggers | MySQL - Triggers | https://www.tutorialspoint.com/mysql/mysql-triggers.htm | 10 |
| 105 | MySQL Triggers | MySQL - Create Trigger | https://www.tutorialspoint.com/mysql/mysql_create_trigger.htm | 11 |
| 106 | MySQL Triggers | MySQL - Show Trigger | https://www.tutorialspoint.com/mysql/mysql_show_triggers_statement.htm | 17 |
| 107 | MySQL Triggers | MySQL - Drop Trigger | https://www.tutorialspoint.com/mysql/mysql_drop_trigger.htm | 12 |
| 108 | MySQL Triggers | MySQL - Before Insert Trigger | https://www.tutorialspoint.com/mysql/mysql-before-insert-trigger.htm | 11 |
| 109 | MySQL Triggers | MySQL - After Insert Trigger | https://www.tutorialspoint.com/mysql/mysql-after-insert-trigger.htm | 4 |
| 110 | MySQL Triggers | MySQL - Before Update Trigger | https://www.tutorialspoint.com/mysql/mysql-before-update-trigger.htm | 11 |
| 111 | MySQL Triggers | MySQL - After Update Trigger | https://www.tutorialspoint.com/mysql/mysql-after-update-trigger.htm | 11 |
| 112 | MySQL Triggers | MySQL - Before Delete Trigger | https://www.tutorialspoint.com/mysql/mysql-before-delete-trigger.htm | 11 |
| 113 | MySQL Triggers | MySQL - After Delete Trigger | https://www.tutorialspoint.com/mysql/mysql-after-delete-trigger.htm | 11 |
| 114 | MySQL Data Types | MySQL - Data Types | https://www.tutorialspoint.com/mysql/mysql-data-types.htm | 4 |
| 115 | MySQL Data Types | MySQL - VARCHAR | https://www.tutorialspoint.com/mysql/mysql-varchar.htm | 17 |
| 116 | MySQL Data Types | MySQL - BOOLEAN | https://www.tutorialspoint.com/mysql/mysql-boolean.htm | 23 |
| 117 | MySQL Data Types | MySQL - ENUM | https://www.tutorialspoint.com/mysql/mysql-enum.htm | 25 |
| 118 | MySQL Data Types | MySQL - DECIMAL | https://www.tutorialspoint.com/mysql/mysql-decimal.htm | 15 |
| 119 | MySQL Data Types | MySQL - INT | https://www.tutorialspoint.com/mysql/mysql-int.htm | 15 |
| 120 | MySQL Data Types | MySQL - FLOAT | https://www.tutorialspoint.com/mysql/mysql-float.htm | 14 |
| 121 | MySQL Data Types | MySQL - BIT | https://www.tutorialspoint.com/mysql/mysql-bit.htm | 12 |
| 122 | MySQL Data Types | MySQL - TINYINT | https://www.tutorialspoint.com/mysql/mysql-tinyint.htm | 10 |
| 123 | MySQL Data Types | MySQL - BLOB | https://www.tutorialspoint.com/mysql/mysql-blob.htm | 15 |
| 124 | MySQL Data Types | MySQL - SET | https://www.tutorialspoint.com/mysql/mysql-set.htm | 26 |
| 125 | MySQL Regular Expressions | MySQL - Regular Expressions | https://www.tutorialspoint.com/mysql/mysql-regexps.htm | 5 |
| 126 | MySQL Regular Expressions | MySQL - RLIKE Operator | https://www.tutorialspoint.com/mysql/mysql-rlike-operator.htm | 17 |
| 127 | MySQL Regular Expressions | MySQL - NOT LIKE Operator | https://www.tutorialspoint.com/mysql/mysql-not-like-operator.htm | 19 |
| 128 | MySQL Regular Expressions | MySQL - NOT REGEXP Operator | https://www.tutorialspoint.com/mysql/mysql-not-regexp-operator.htm | 11 |
| 129 | MySQL Regular Expressions | MySQL - regexp_instr() Function | https://www.tutorialspoint.com/mysql/mysql-regexp-instr-function.htm | 19 |
| 130 | MySQL Regular Expressions | MySQL - regexp_like() Function | https://www.tutorialspoint.com/mysql/mysql-regexp-like-function.htm | 13 |
| 131 | MySQL Regular Expressions | MySQL - regexp_replace() Function | https://www.tutorialspoint.com/mysql/mysql-regexp-replace-function.htm | 23 |
| 132 | MySQL Regular Expressions | MySQL - regexp_substr() Function | https://www.tutorialspoint.com/mysql/mysql-regexp-substr-function.htm | 16 |
| 133 | MySQL Fulltext Search | MySQL - Fulltext Search | https://www.tutorialspoint.com/mysql/mysql-fulltext-search.htm | 15 |
| 134 | MySQL Fulltext Search | MySQL - Natural Language Fulltext Search | https://www.tutorialspoint.com/mysql/mysql-natural-language-fulltext-search.htm | 13 |
| 135 | MySQL Fulltext Search | MySQL - Boolean Fulltext Search | https://www.tutorialspoint.com/mysql/mysql-boolean-fulltext-search.htm | 23 |
| 136 | MySQL Fulltext Search | MySQL - Query Expansion Fulltext Search | https://www.tutorialspoint.com/mysql/mysql-query-expansion-fulltext-search.htm | 12 |
| 137 | MySQL Fulltext Search | MySQL - ngram Fulltext Parser | https://www.tutorialspoint.com/mysql/mysql-ngram-fulltext-parser.htm | 16 |
| 138 | MySQL Functions & Operators | MySQL - Date and Time Functions | https://www.tutorialspoint.com/mysql/mysql-date-time-functions.htm | 0 |
| 139 | MySQL Functions & Operators | MySQL - Arithmetic Operators | https://www.tutorialspoint.com/mysql/mysql-arithmetic-operators.htm | 1 |
| 140 | MySQL Functions & Operators | MySQL - Numeric Functions | https://www.tutorialspoint.com/mysql/mysql-numeric-functions.htm | 1 |
| 141 | MySQL Functions & Operators | MySQL - String Functions | https://www.tutorialspoint.com/mysql/mysql-string-functions.htm | 1 |
| 142 | MySQL Functions & Operators | MySQL - Aggregate Functions | https://www.tutorialspoint.com/mysql/mysql-aggregate-functions.htm | 0 |
| 143 | MySQL Misc Concepts | MySQL - NULL Values | https://www.tutorialspoint.com/mysql/mysql-null-values.htm | 19 |
| 144 | MySQL Misc Concepts | MySQL - Transactions | https://www.tutorialspoint.com/mysql/mysql-transactions.htm | 24 |
| 145 | MySQL Misc Concepts | MySQL - Using Sequences | https://www.tutorialspoint.com/mysql/mysql-using-sequences.htm | 20 |
| 146 | MySQL Misc Concepts | MySQL - Handling Duplicates | https://www.tutorialspoint.com/mysql/mysql-handling-duplicates.htm | 14 |
| 147 | MySQL Misc Concepts | MySQL - SQL Injection | https://www.tutorialspoint.com/mysql/mysql-sql-injection.htm | 3 |
| 148 | MySQL Misc Concepts | MySQL - SubQuery | https://www.tutorialspoint.com/mysql/mysql-subquery.htm | 25 |
| 149 | MySQL Misc Concepts | MySQL - Comments | https://www.tutorialspoint.com/mysql/mysql-comments.htm | 13 |
| 150 | MySQL Misc Concepts | MySQL - Check Constraints | https://www.tutorialspoint.com/mysql/mysql-check-constraints.htm | 25 |
| 151 | MySQL Misc Concepts | MySQL - Storage Engines | https://www.tutorialspoint.com/mysql/mysql-storage-engines.htm | 36 |
| 152 | MySQL Misc Concepts | MySQL - Export Table into CSV File | https://www.tutorialspoint.com/mysql/mysql-export-table-into-csv.htm | 23 |
| 153 | MySQL Misc Concepts | MySQL - Import CSV File into Database | https://www.tutorialspoint.com/mysql/mysql-import-csv-into-database.htm | 10 |
| 154 | MySQL Misc Concepts | MySQL - UUID | https://www.tutorialspoint.com/mysql/mysql-uuid.htm | 17 |
| 155 | MySQL Misc Concepts | MySQL - Common Table Expressions | https://www.tutorialspoint.com/mysql/mysql-common-table-expression.htm | 6 |
| 156 | MySQL Misc Concepts | MySQL - On Delete Cascade | https://www.tutorialspoint.com/mysql/mysql-on-delete-cascade.htm | 3 |
| 157 | MySQL Misc Concepts | MySQL - Upsert | https://www.tutorialspoint.com/mysql/mysql-upsert.htm | 13 |
| 158 | MySQL Misc Concepts | MySQL - Horizontal Partitioning | https://www.tutorialspoint.com/mysql/mysql-horizontal-partitioning.htm | 11 |
| 159 | MySQL Misc Concepts | MySQL - Vertical Partitioning | https://www.tutorialspoint.com/mysql/mysql-vertical-partitioning.htm | 5 |
| 160 | MySQL Misc Concepts | MySQL - Cursor | https://www.tutorialspoint.com/mysql/mysql-cursors.htm | 7 |
| 161 | MySQL Misc Concepts | MySQL - Stored Functions | https://www.tutorialspoint.com/mysql/mysql-stored-functions.htm | 6 |
| 162 | MySQL Misc Concepts | MySQL - Signal | https://www.tutorialspoint.com/mysql/mysql_signal_statement.htm | 7 |
| 163 | MySQL Misc Concepts | MySQL - Resignal | https://www.tutorialspoint.com/mysql/mysql_resignal_statement.htm | 12 |
| 164 | MySQL Misc Concepts | MySQL - Character Set | https://www.tutorialspoint.com/mysql/mysql-character-set.htm | 10 |
| 165 | MySQL Misc Concepts | MySQL - Collation | https://www.tutorialspoint.com/mysql/mysql-collation.htm | 20 |
| 166 | MySQL Misc Concepts | MySQL - Wildcards | https://www.tutorialspoint.com/mysql/mysql-wildcards.htm | 22 |
| 167 | MySQL Misc Concepts | MySQL - Alias | https://www.tutorialspoint.com/mysql/mysql-alias.htm | 18 |
| 168 | MySQL Misc Concepts | MySQL - ROLLUP | https://www.tutorialspoint.com/mysql/mysql-rollup.htm | 13 |
| 169 | MySQL Misc Concepts | MySQL - Today Date | https://www.tutorialspoint.com/mysql/mysql-today-date.htm | 16 |
| 170 | MySQL Misc Concepts | MySQL - Literals | https://www.tutorialspoint.com/mysql/mysql-literals.htm | 68 |
| 171 | MySQL Misc Concepts | MySQL - Stored Procedure | https://www.tutorialspoint.com/mysql/mysql-stored-procedure.htm | 28 |
| 172 | MySQL Misc Concepts | MySQL - Explain | https://www.tutorialspoint.com/mysql/mysql_explain_statement.htm | 9 |
| 173 | MySQL Misc Concepts | MySQL - JSON | https://www.tutorialspoint.com/mysql/mysql-json.htm | 27 |
| 174 | MySQL Misc Concepts | MySQL - Standard Deviation | https://www.tutorialspoint.com/mysql/mysql-standard-deviation.htm | 11 |
| 175 | MySQL Misc Concepts | MySQL - Find Duplicate Records | https://www.tutorialspoint.com/mysql/mysql-find-duplicate-records.htm | 20 |
| 176 | MySQL Misc Concepts | MySQL - Delete Duplicate Records | https://www.tutorialspoint.com/mysql/mysql-delete-duplicate-records.htm | 14 |
| 177 | MySQL Misc Concepts | MySQL - Select Random Records | https://www.tutorialspoint.com/mysql/mysql-select-random-records.htm | 15 |
| 178 | MySQL Misc Concepts | MySQL - Show Processlist | https://www.tutorialspoint.com/mysql/mysql-show-processlist.htm | 15 |
| 179 | MySQL Misc Concepts | MySQL - Change Column Type | https://www.tutorialspoint.com/mysql/mysql-change-column-type.htm | 10 |
| 180 | MySQL Misc Concepts | MySQL - Reset Auto-Increment | https://www.tutorialspoint.com/mysql/mysql-reset-autoincrement.htm | 15 |
| 181 | MySQL Misc Concepts | MySQL - Coalesce() Function | https://www.tutorialspoint.com/mysql/mysql-coalesce-function.htm | 13 |
| 182 | MySQL Useful Resources | MySQL - Useful Functions | https://www.tutorialspoint.com/mysql/mysql-useful-functions.htm | 1 |
| 183 | MySQL Useful Resources | MySQL - Statements Reference | https://www.tutorialspoint.com/mysql/mysql_statements_reference.htm | 16 |
| 184 | MySQL Useful Resources | MySQL - Quick Guide | https://www.tutorialspoint.com/mysql/mysql-quick-guide.htm | 143 |
| 185 | MySQL Useful Resources | MySQL - Useful Resources | https://www.tutorialspoint.com/mysql/mysql-useful-resources.htm | 0 |
| 186 | MySQL Useful Resources | MySQL - Discussion | https://www.tutorialspoint.com/mysql/mysql-discussion.htm | 0 |

## sqlite

SQLite Tutorial · https://www.tutorialspoint.com/sqlite/index.htm · 54 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | SQLite - Home | https://www.tutorialspoint.com/sqlite/index.htm | 3 |
| 2 | (no heading) | SQLite - Overview | https://www.tutorialspoint.com/sqlite/sqlite_overview.htm | 8 |
| 3 | (no heading) | SQLite - Installation | https://www.tutorialspoint.com/sqlite/sqlite_installation.htm | 3 |
| 4 | (no heading) | SQLite - Commands | https://www.tutorialspoint.com/sqlite/sqlite_commands.htm | 2 |
| 5 | (no heading) | SQLite - Syntax | https://www.tutorialspoint.com/sqlite/sqlite_syntax.htm | 45 |
| 6 | (no heading) | SQLite - Data Type | https://www.tutorialspoint.com/sqlite/sqlite_data_types.htm | 5 |
| 7 | (no heading) | SQLite - CREATE Database | https://www.tutorialspoint.com/sqlite/sqlite_create_database.htm | 3 |
| 8 | (no heading) | SQLite - ATTACH Database | https://www.tutorialspoint.com/sqlite/sqlite_attach_database.htm | 2 |
| 9 | (no heading) | SQLite - DETACH Database | https://www.tutorialspoint.com/sqlite/sqlite_detach_database.htm | 2 |
| 10 | (no heading) | SQLite - CREATE Table | https://www.tutorialspoint.com/sqlite/sqlite_create_table.htm | 2 |
| 11 | (no heading) | SQLite - DROP Table | https://www.tutorialspoint.com/sqlite/sqlite_drop_table.htm | 2 |
| 12 | (no heading) | SQLite - INSERT Query | https://www.tutorialspoint.com/sqlite/sqlite_insert_query.htm | 3 |
| 13 | (no heading) | SQLite - SELECT Query | https://www.tutorialspoint.com/sqlite/sqlite_select_query.htm | 4 |
| 14 | (no heading) | SQLite - Operators | https://www.tutorialspoint.com/sqlite/sqlite_operators.htm | 5 |
| 15 | (no heading) | SQLite - Expressions | https://www.tutorialspoint.com/sqlite/sqlite_expressions.htm | 4 |
| 16 | (no heading) | SQLite - WHERE Clause | https://www.tutorialspoint.com/sqlite/sqlite_where_clause.htm | 2 |
| 17 | (no heading) | SQLite - AND & OR Clauses | https://www.tutorialspoint.com/sqlite/sqlite_and_or_clauses.htm | 6 |
| 18 | (no heading) | SQLite - UPDATE Query | https://www.tutorialspoint.com/sqlite/sqlite_update_query.htm | 2 |
| 19 | (no heading) | SQLite - DELETE Query | https://www.tutorialspoint.com/sqlite/sqlite_delete_query.htm | 2 |
| 20 | (no heading) | SQLite - LIKE Clause | https://www.tutorialspoint.com/sqlite/sqlite_like_clause.htm | 2 |
| 21 | (no heading) | SQLite - GLOB Clause | https://www.tutorialspoint.com/sqlite/sqlite_glob_clause.htm | 2 |
| 22 | (no heading) | SQLite - LIMIT Clause | https://www.tutorialspoint.com/sqlite/sqlite_limit_clause.htm | 2 |
| 23 | (no heading) | SQLite - ORDER By Clause | https://www.tutorialspoint.com/sqlite/sqlite_order_by.htm | 2 |
| 24 | (no heading) | SQLite - GROUP By Clause | https://www.tutorialspoint.com/sqlite/sqlite_group_by.htm | 2 |
| 25 | (no heading) | SQLite - HAVING Clause | https://www.tutorialspoint.com/sqlite/sqlite_having_clause.htm | 2 |
| 26 | (no heading) | SQLite - DISTINCT Keyword | https://www.tutorialspoint.com/sqlite/sqlite_distinct_keyword.htm | 2 |
| 27 | SQLite Advanced Concepts | SQLite - PRAGMA | https://www.tutorialspoint.com/sqlite/sqlite_pragma.htm | 24 |
| 28 | SQLite Advanced Concepts | SQLite - Constraints | https://www.tutorialspoint.com/sqlite/sqlite_constraints.htm | 11 |
| 29 | SQLite Advanced Concepts | SQLite - JOINS | https://www.tutorialspoint.com/sqlite/sqlite_using_joins.htm | 3 |
| 30 | SQLite Advanced Concepts | SQLite - UNION Clause | https://www.tutorialspoint.com/sqlite/sqlite_unions_clause.htm | 5 |
| 31 | SQLite Advanced Concepts | SQLite - NULL Values | https://www.tutorialspoint.com/sqlite/sqlite_null_values.htm | 2 |
| 32 | SQLite Advanced Concepts | SQLite - ALIAS Syntax | https://www.tutorialspoint.com/sqlite/sqlite_alias_syntax.htm | 2 |
| 33 | SQLite Advanced Concepts | SQLite - Triggers | https://www.tutorialspoint.com/sqlite/sqlite_triggers.htm | 4 |
| 34 | SQLite Advanced Concepts | SQLite - Indexes | https://www.tutorialspoint.com/sqlite/sqlite_indexes.htm | 7 |
| 35 | SQLite Advanced Concepts | SQLite - INDEXED By Clause | https://www.tutorialspoint.com/sqlite/sqlite_indexed_by.htm | 2 |
| 36 | SQLite Advanced Concepts | SQLite - ALTER Command | https://www.tutorialspoint.com/sqlite/sqlite_alter_command.htm | 2 |
| 37 | SQLite Advanced Concepts | SQLite - TRUNCATE Command | https://www.tutorialspoint.com/sqlite/sqlite_truncate_table.htm | 2 |
| 38 | SQLite Advanced Concepts | SQLite - Views | https://www.tutorialspoint.com/sqlite/sqlite_views.htm | 3 |
| 39 | SQLite Advanced Concepts | SQLite - Transactions | https://www.tutorialspoint.com/sqlite/sqlite_transactions.htm | 5 |
| 40 | SQLite Advanced Concepts | SQLite - Subqueries | https://www.tutorialspoint.com/sqlite/sqlite_sub_queries.htm | 8 |
| 41 | SQLite Advanced Concepts | SQLite - AUTOINCREMENT | https://www.tutorialspoint.com/sqlite/sqlite_using_autoincrement.htm | 2 |
| 42 | SQLite Advanced Concepts | SQLite - Injection | https://www.tutorialspoint.com/sqlite/sqlite_injection.htm | 1 |
| 43 | SQLite Advanced Concepts | SQLite - EXPLAIN | https://www.tutorialspoint.com/sqlite/sqlite_explain.htm | 2 |
| 44 | SQLite Advanced Concepts | SQLite - VACUUM | https://www.tutorialspoint.com/sqlite/sqlite_vacuum.htm | 2 |
| 45 | SQLite Advanced Concepts | SQLite - Date & Time | https://www.tutorialspoint.com/sqlite/sqlite_date_time.htm | 4 |
| 46 | SQLite Advanced Concepts | SQLite - Useful Functions | https://www.tutorialspoint.com/sqlite/sqlite_useful_functions.htm | 11 |
| 47 | SQLite Interfaces | SQLite - C/C++ | https://www.tutorialspoint.com/sqlite/sqlite_c_cpp.htm | 8 |
| 48 | SQLite Interfaces | SQLite - Java | https://www.tutorialspoint.com/sqlite/sqlite_java.htm | 7 |
| 49 | SQLite Interfaces | SQLite - PHP | https://www.tutorialspoint.com/sqlite/sqlite_php.htm | 8 |
| 50 | SQLite Interfaces | SQLite - Perl | https://www.tutorialspoint.com/sqlite/sqlite_perl.htm | 8 |
| 51 | SQLite Interfaces | SQLite - Python | https://www.tutorialspoint.com/sqlite/sqlite_python.htm | 8 |
| 52 | SQLite Useful Resources | SQLite - Quick Guide | https://www.tutorialspoint.com/sqlite/sqlite_quick_guide.htm | 257 |
| 53 | SQLite Useful Resources | SQLite - Useful Resources | https://www.tutorialspoint.com/sqlite/sqlite_useful_resources.htm | 0 |
| 54 | SQLite Useful Resources | SQLite - Discussion | https://www.tutorialspoint.com/sqlite/sqlite_discussion.htm | 0 |

## mongodb

MongoDB Tutorial · https://www.tutorialspoint.com/mongodb/index.htm · 61 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | MongoDB - Home | https://www.tutorialspoint.com/mongodb/index.htm | 8 |
| 2 | (no heading) | MongoDB - Overview | https://www.tutorialspoint.com/mongodb/mongodb_overview.htm | 4 |
| 3 | (no heading) | MongoDB - Advantages | https://www.tutorialspoint.com/mongodb/mongodb_advantages.htm | 3 |
| 4 | (no heading) | MongoDB - Environment | https://www.tutorialspoint.com/mongodb/mongodb_environment.htm | 8 |
| 5 | (no heading) | MongoDB - Data Modeling | https://www.tutorialspoint.com/mongodb/mongodb_data_modeling.htm | 5 |
| 6 | (no heading) | MongoDB - Create Database | https://www.tutorialspoint.com/mongodb/mongodb_create_database.htm | 3 |
| 7 | (no heading) | MongoDB - Drop Database | https://www.tutorialspoint.com/mongodb/mongodb_drop_database.htm | 3 |
| 8 | (no heading) | MongoDB - Create Collection | https://www.tutorialspoint.com/mongodb/mongodb_create_collection.htm | 5 |
| 9 | (no heading) | MongoDB - Drop Collection | https://www.tutorialspoint.com/mongodb/mongodb_drop_collection.htm | 3 |
| 10 | (no heading) | MongoDB - Data Types | https://www.tutorialspoint.com/mongodb/mongodb_datatype.htm | 0 |
| 11 | (no heading) | MongoDB - Insert Document | https://www.tutorialspoint.com/mongodb/mongodb_insert_document.htm | 5 |
| 12 | (no heading) | MongoDB - Query Document | https://www.tutorialspoint.com/mongodb/mongodb_query_document.htm | 24 |
| 13 | (no heading) | MongoDB - Update Document | https://www.tutorialspoint.com/mongodb/mongodb_update_document.htm | 12 |
| 14 | (no heading) | MongoDB - Delete Document | https://www.tutorialspoint.com/mongodb/mongodb_delete_document.htm | 8 |
| 15 | (no heading) | MongoDB - Projection | https://www.tutorialspoint.com/mongodb/mongodb_projection.htm | 3 |
| 16 | (no heading) | MongoDB - Limiting Records | https://www.tutorialspoint.com/mongodb/mongodb_limit_record.htm | 6 |
| 17 | (no heading) | MongoDB - Sorting Records | https://www.tutorialspoint.com/mongodb/mongodb_sort_record.htm | 3 |
| 18 | (no heading) | MongoDB - Indexing | https://www.tutorialspoint.com/mongodb/mongodb_indexing.htm | 12 |
| 19 | (no heading) | MongoDB - Aggregation | https://www.tutorialspoint.com/mongodb/mongodb_aggregation.htm | 4 |
| 20 | (no heading) | MongoDB - Replication | https://www.tutorialspoint.com/mongodb/mongodb_replication.htm | 8 |
| 21 | (no heading) | MongoDB - Sharding | https://www.tutorialspoint.com/mongodb/mongodb_sharding.htm | 2 |
| 22 | (no heading) | MongoDB - Create Backup | https://www.tutorialspoint.com/mongodb/mongodb_create_backup.htm | 5 |
| 23 | (no heading) | MongoDB - Deployment | https://www.tutorialspoint.com/mongodb/mongodb_deployment.htm | 2 |
| 24 | MongoDB - Java | MongoDB - Java Setup | https://www.tutorialspoint.com/mongodb/mongodb_java.htm | 5 |
| 25 | MongoDB - Java | MongoDB - Java - Create Collection | https://www.tutorialspoint.com/mongodb/mongodb_java_create_collection.htm | 3 |
| 26 | MongoDB - Java | MongoDB - Java - Get Collection | https://www.tutorialspoint.com/mongodb/mongodb_java_get_collection.htm | 3 |
| 27 | MongoDB - Java | MongoDB - Java - Insert Document | https://www.tutorialspoint.com/mongodb/mongodb_java_insert_document.htm | 3 |
| 28 | MongoDB - Java | MongoDB - Java - Retrieve Documents | https://www.tutorialspoint.com/mongodb/mongodb_java_retrieve_document.htm | 3 |
| 29 | MongoDB - Java | MongoDB - Java - Update Document | https://www.tutorialspoint.com/mongodb/mongodb_java_update_document.htm | 3 |
| 30 | MongoDB - Java | MongoDB - Java - Delete Document | https://www.tutorialspoint.com/mongodb/mongodb_java_delete_document.htm | 3 |
| 31 | MongoDB - Java | MongoDB - Java - Drop Collection | https://www.tutorialspoint.com/mongodb/mongodb_java_drop_collection.htm | 3 |
| 32 | MongoDB - Java | MongoDB - Java - List Collections | https://www.tutorialspoint.com/mongodb/mongodb_java_list_collections.htm | 3 |
| 33 | MongoDB - PHP | MongoDB - PHP Setup | https://www.tutorialspoint.com/mongodb/mongodb_php.htm | 6 |
| 34 | MongoDB - PHP | MongoDB - PHP - Create Collection | https://www.tutorialspoint.com/mongodb/mongodb_php_create_collection.htm | 3 |
| 35 | MongoDB - PHP | MongoDB - PHP - Get Collection | https://www.tutorialspoint.com/mongodb/mongodb_php_get_collection.htm | 3 |
| 36 | MongoDB - PHP | MongoDB - PHP - Insert Document | https://www.tutorialspoint.com/mongodb/mongodb_php_insert_document.htm | 3 |
| 37 | MongoDB - PHP | MongoDB - PHP - Retrieve Documents | https://www.tutorialspoint.com/mongodb/mongodb_php_retrieve_document.htm | 3 |
| 38 | MongoDB - PHP | MongoDB - PHP - Update Document | https://www.tutorialspoint.com/mongodb/mongodb_php_update_document.htm | 3 |
| 39 | MongoDB - PHP | MongoDB - PHP - Delete Document | https://www.tutorialspoint.com/mongodb/mongodb_php_delete_document.htm | 3 |
| 40 | MongoDB - PHP | MongoDB - PHP - Drop Collection | https://www.tutorialspoint.com/mongodb/mongodb_php_drop_collection.htm | 3 |
| 41 | MongoDB - PHP | MongoDB - PHP - List Collections | https://www.tutorialspoint.com/mongodb/mongodb_php_list_collections.htm | 3 |
| 42 | MongoDB - Advanced | MongoDB - Relationships | https://www.tutorialspoint.com/mongodb/mongodb_relationships.htm | 2 |
| 43 | MongoDB - Advanced | MongoDB - Database References | https://www.tutorialspoint.com/mongodb/mongodb_database_references.htm | 2 |
| 44 | MongoDB - Advanced | MongoDB - Covered Queries | https://www.tutorialspoint.com/mongodb/mongodb_covered_queries.htm | 2 |
| 45 | MongoDB - Advanced | MongoDB - Analyzing Queries | https://www.tutorialspoint.com/mongodb/mongodb_analyzing_queries.htm | 2 |
| 46 | MongoDB - Advanced | MongoDB - Atomic Operations | https://www.tutorialspoint.com/mongodb/mongodb_atomic_operations.htm | 1 |
| 47 | MongoDB - Advanced | MongoDB - Advanced Indexing | https://www.tutorialspoint.com/mongodb/mongodb_advanced_indexing.htm | 2 |
| 48 | MongoDB - Advanced | MongoDB - Indexing Limitations | https://www.tutorialspoint.com/mongodb/mongodb_indexing_limitations.htm | 6 |
| 49 | MongoDB - Advanced | MongoDB - ObjectId | https://www.tutorialspoint.com/mongodb/mongodb_objectid.htm | 3 |
| 50 | MongoDB - Advanced | MongoDB - Map Reduce | https://www.tutorialspoint.com/mongodb/mongodb_map_reduce.htm | 2 |
| 51 | MongoDB - Advanced | MongoDB - Text Search | https://www.tutorialspoint.com/mongodb/mongodb_text_search.htm | 4 |
| 52 | MongoDB - Advanced | MongoDB - Regular Expression | https://www.tutorialspoint.com/mongodb/mongodb_regular_expression.htm | 4 |
| 53 | MongoDB - Advanced | Working with Rockmongo | https://www.tutorialspoint.com/mongodb/working_with_rockmongo.htm | 7 |
| 54 | MongoDB - Advanced | MongoDB - GridFS | https://www.tutorialspoint.com/mongodb/mongodb_gridfs.htm | 1 |
| 55 | MongoDB - Advanced | MongoDB - Capped Collections | https://www.tutorialspoint.com/mongodb/mongodb_capped_collections.htm | 2 |
| 56 | MongoDB - Advanced | Auto-Increment Sequence | https://www.tutorialspoint.com/mongodb/mongodb_autoincrement_sequence.htm | 3 |
| 57 | MongoDB - Useful Resources | MongoDB - Questions and Answers | https://www.tutorialspoint.com/mongodb/mongodb_questions_answers.htm | 0 |
| 58 | MongoDB - Useful Resources | MongoDB - Cheatsheet | https://www.tutorialspoint.com/mongodb/mongodb_cheatsheet.htm | 29 |
| 59 | MongoDB - Useful Resources | MongoDB - Quick Guide | https://www.tutorialspoint.com/mongodb/mongodb_quick_guide.htm | 161 |
| 60 | MongoDB - Useful Resources | MongoDB - Useful Resources | https://www.tutorialspoint.com/mongodb/mongodb_useful_resources.htm | 0 |
| 61 | MongoDB - Useful Resources | MongoDB - Discussion | https://www.tutorialspoint.com/mongodb/mongodb_discussion.htm | 0 |

## dynamodb

DynamoDB Tutorial · https://www.tutorialspoint.com/dynamodb/index.htm · 38 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | DynamoDB - Home | https://www.tutorialspoint.com/dynamodb/index.htm | 0 |
| 2 | (no heading) | DynamoDB - Overview | https://www.tutorialspoint.com/dynamodb/dynamodb_overview.htm | 3 |
| 3 | (no heading) | DynamoDB - Basic Concepts | https://www.tutorialspoint.com/dynamodb/dynamodb_basic_concepts.htm | 6 |
| 4 | (no heading) | DynamoDB - Environment | https://www.tutorialspoint.com/dynamodb/dynamodb_environment.htm | 3 |
| 5 | (no heading) | DynamoDB - Operations Tools | https://www.tutorialspoint.com/dynamodb/dynamodb_operations_tools.htm | 3 |
| 6 | (no heading) | DynamoDB - Data Types | https://www.tutorialspoint.com/dynamodb/dynamodb_data_types.htm | 6 |
| 7 | (no heading) | DynamoDB - Create Table | https://www.tutorialspoint.com/dynamodb/dynamodb_create_table.htm | 2 |
| 8 | (no heading) | DynamoDB - Load Table | https://www.tutorialspoint.com/dynamodb/dynamodb_load_table.htm | 2 |
| 9 | (no heading) | DynamoDB - Query Table | https://www.tutorialspoint.com/dynamodb/dynamodb_query_table.htm | 2 |
| 10 | (no heading) | DynamoDB - Delete Table | https://www.tutorialspoint.com/dynamodb/dynamodb_delete_table.htm | 2 |
| 11 | (no heading) | DynamoDB - API Interface | https://www.tutorialspoint.com/dynamodb/dynamodb_api_interface.htm | 3 |
| 12 | (no heading) | DynamoDB - Creating Items | https://www.tutorialspoint.com/dynamodb/dynamodb_creating_items.htm | 3 |
| 13 | (no heading) | DynamoDB - Getting Items | https://www.tutorialspoint.com/dynamodb/dynamodb_getting_items.htm | 2 |
| 14 | (no heading) | DynamoDB - Update Items | https://www.tutorialspoint.com/dynamodb/dynamodb_update_items.htm | 3 |
| 15 | (no heading) | DynamoDB - Delete Items | https://www.tutorialspoint.com/dynamodb/dynamodb_delete_items.htm | 2 |
| 16 | (no heading) | DynamoDB - Batch Writing | https://www.tutorialspoint.com/dynamodb/dynamodb_batch_writing.htm | 2 |
| 17 | (no heading) | DynamoDB - Batch Retrieve | https://www.tutorialspoint.com/dynamodb/dynamodb_batch_retrieve.htm | 1 |
| 18 | (no heading) | DynamoDB - Querying | https://www.tutorialspoint.com/dynamodb/dynamodb_querying.htm | 1 |
| 19 | (no heading) | DynamoDB - Scan | https://www.tutorialspoint.com/dynamodb/dynamodb_scan.htm | 3 |
| 20 | (no heading) | DynamoDB - Indexes | https://www.tutorialspoint.com/dynamodb/dynamodb_indexes.htm | 1 |
| 21 | (no heading) | Global Secondary Indexes | https://www.tutorialspoint.com/dynamodb/dynamodb_global_secondary_indexes.htm | 7 |
| 22 | (no heading) | Local Secondary Indexes | https://www.tutorialspoint.com/dynamodb/dynamodb_local_secondary_indexes.htm | 11 |
| 23 | (no heading) | DynamoDB - Aggregation | https://www.tutorialspoint.com/dynamodb/dynamodb_aggregation.htm | 3 |
| 24 | (no heading) | DynamoDB - Access Control | https://www.tutorialspoint.com/dynamodb/dynamodb_access_control.htm | 12 |
| 25 | (no heading) | DynamoDB - Permissions API | https://www.tutorialspoint.com/dynamodb/dynamodb_permissions_api.htm | 2 |
| 26 | (no heading) | DynamoDB - Conditions | https://www.tutorialspoint.com/dynamodb/dynamodb_conditions.htm | 2 |
| 27 | (no heading) | Web Identity Federation | https://www.tutorialspoint.com/dynamodb/dynamodb_web_identity_federation.htm | 1 |
| 28 | (no heading) | DynamoDB - Data Pipeline | https://www.tutorialspoint.com/dynamodb/dynamodb_data_pipeline.htm | 2 |
| 29 | (no heading) | DynamoDB - Data Backup | https://www.tutorialspoint.com/dynamodb/dynamodb_data_backup.htm | 3 |
| 30 | (no heading) | DynamoDB - Monitoring | https://www.tutorialspoint.com/dynamodb/dynamodb_monitoring.htm | 2 |
| 31 | (no heading) | DynamoDB - CloudTrail | https://www.tutorialspoint.com/dynamodb/dynamodb_cloudtrail.htm | 1 |
| 32 | (no heading) | DynamoDB - MapReduce | https://www.tutorialspoint.com/dynamodb/dynamodb_mapreduce.htm | 5 |
| 33 | (no heading) | DynamoDB - Table Activity | https://www.tutorialspoint.com/dynamodb/dynamodb_table_activity.htm | 2 |
| 34 | (no heading) | DynamoDB - Error Handling | https://www.tutorialspoint.com/dynamodb/dynamodb_error_handling.htm | 2 |
| 35 | (no heading) | DynamoDB - Best Practices | https://www.tutorialspoint.com/dynamodb/dynamodb_best_practices.htm | 5 |
| 36 | (no heading) | DynamoDB - Quick Guide | https://www.tutorialspoint.com/dynamodb/dynamodb_quick_guide.htm | 110 |
| 37 | (no heading) | DynamoDB - Useful Resources | https://www.tutorialspoint.com/dynamodb/dynamodb_useful_resources.htm | 0 |
| 38 | (no heading) | DynamoDB - Discussion | https://www.tutorialspoint.com/dynamodb/dynamodb_discussion.htm | 0 |

## dbms

DBMS Tutorial · https://www.tutorialspoint.com/dbms/index.htm · 91 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | DBMS - Home | https://www.tutorialspoint.com/dbms/index.htm | 42 |
| 2 | (no heading) | DBMS - Overview | https://www.tutorialspoint.com/dbms/dbms_overview.htm | 2 |
| 3 | (no heading) | DBMS - Architecture | https://www.tutorialspoint.com/dbms/dbms_architecture.htm | 1 |
| 4 | (no heading) | DBMS - Data Models | https://www.tutorialspoint.com/dbms/dbms_data_models.htm | 2 |
| 5 | (no heading) | DBMS - Data Schemas | https://www.tutorialspoint.com/dbms/dbms_data_schemas.htm | 2 |
| 6 | (no heading) | DBMS - Data Independence | https://www.tutorialspoint.com/dbms/dbms_data_independence.htm | 3 |
| 7 | (no heading) | DBMS - System Environment | https://www.tutorialspoint.com/dbms/dbms_system_environment.htm | 16 |
| 8 | (no heading) | Centralized and Client/Server Architecture | https://www.tutorialspoint.com/dbms/dbms_centralized_and_client_server_architecture.htm | 10 |
| 9 | (no heading) | DBMS - Classification | https://www.tutorialspoint.com/dbms/dbms_classification.htm | 19 |
| 10 | Relational Model | DBMS - Codd's Rules | https://www.tutorialspoint.com/dbms/dbms_codds_rules.htm | 12 |
| 11 | Relational Model | DBMS - Relational Data Model | https://www.tutorialspoint.com/dbms/relational_data_model.htm | 5 |
| 12 | Relational Model | DBMS - Relational Model Constraints | https://www.tutorialspoint.com/dbms/dbms_relational_model_constraints.htm | 12 |
| 13 | Relational Model | DBMS - Relational Database Schemas | https://www.tutorialspoint.com/dbms/dbms_relational_database_schemas.htm | 11 |
| 14 | Relational Model | DBMS - Handling Constraint Violations | https://www.tutorialspoint.com/dbms/dbms_handling_constraint_violations.htm | 11 |
| 15 | Entity Relationship Model | DBMS - ER Model Basic Concepts | https://www.tutorialspoint.com/dbms/er_model_basic_concepts.htm | 8 |
| 16 | Entity Relationship Model | DBMS - ER Diagram Representation | https://www.tutorialspoint.com/dbms/er_diagram_representation.htm | 5 |
| 17 | Entity Relationship Model | Relationship Types and Relationship Sets | https://www.tutorialspoint.com/dbms/relationship_types_and_relationship_sets_in_dbms.htm | 11 |
| 18 | Entity Relationship Model | DBMS - Weak Entity Types | https://www.tutorialspoint.com/dbms/dbms_weak_entity_types.htm | 10 |
| 19 | Entity Relationship Model | DBMS - Generalization, Aggregation | https://www.tutorialspoint.com/dbms/dbms_generalization_aggregation.htm | 3 |
| 20 | Entity Relationship Model | DBMS - Drawing an ER Diagram | https://www.tutorialspoint.com/dbms/dbms_drawing_er_diagram.htm | 15 |
| 21 | Entity Relationship Model | Designing ERD for a real-life example | https://www.tutorialspoint.com/dbms/dbms_designing_erd_for_a_real_life_example.htm | 404 |
| 22 | Entity Relationship Model | DBMS - Enhanced ER Model | https://www.tutorialspoint.com/dbms/dbms_enhanced_er_model.htm | 10 |
| 23 | Entity Relationship Model | Subclass, Superclass and Inheritance in EER | https://www.tutorialspoint.com/dbms/subclass_superclass_and_inheritance_in_eer.htm | 14 |
| 24 | Entity Relationship Model | Specialization and Generalization in Extended ER Model | https://www.tutorialspoint.com/dbms/specialization_and_generalization_in_extended_er_model.htm | 14 |
| 25 | Entity Relationship Model | Data Abstraction and Knowledge Representation | https://www.tutorialspoint.com/dbms/data_abstraction_and_knowledge_representation.htm | 10 |
| 26 | Relational Algebra | DBMS - Relational Algebra | https://www.tutorialspoint.com/dbms/relational_algebra.htm | 10 |
| 27 | Relational Algebra | Unary Relational Operation | https://www.tutorialspoint.com/dbms/dbms_unary_relational_operations.htm | 16 |
| 28 | Relational Algebra | Set Theory Operations | https://www.tutorialspoint.com/dbms/dbms_set_theory_operations.htm | 20 |
| 29 | Relational Algebra | DBMS - Database Joins | https://www.tutorialspoint.com/dbms/database_joins.htm | 8 |
| 30 | Relational Algebra | DBMS - Division Operation | https://www.tutorialspoint.com/dbms/dbms_division_operation.htm | 13 |
| 31 | Relational Algebra | DBMS - ER to Relational Model | https://www.tutorialspoint.com/dbms/er_model_to_relational_model.htm | 8 |
| 32 | Relational Algebra | Examples of Query in Relational Algebra | https://www.tutorialspoint.com/dbms/example_queries_on_relational_algebra.htm | 14 |
| 33 | Relational Calculus | Tuple Relational Calculus | https://www.tutorialspoint.com/dbms/dbms_tuple_relational_calculus.htm | 14 |
| 34 | Relational Calculus | Domain Relational Calculus | https://www.tutorialspoint.com/dbms/dbms_domain_relational_calculus.htm | 14 |
| 35 | Relational Database Design | DBMS - Concept of Functional Dependency | https://www.tutorialspoint.com/dbms/dbms_concept_of_functional_dependency.htm | 404 |
| 36 | Relational Database Design | DBMS - Functional Dependency | https://www.tutorialspoint.com/dbms/dbms_functional_dependency.htm | 11 |
| 37 | Relational Database Design | DBMS - Inference Rules | https://www.tutorialspoint.com/dbms/dbms_inference_rules.htm | 12 |
| 38 | Relational Database Design | DBMS - Minimal Cover | https://www.tutorialspoint.com/dbms/dbms_minimal_cover.htm | 9 |
| 39 | Relational Database Design | Equivalence of Functional Dependency | https://www.tutorialspoint.com/dbms/equivalence_of_functional_dependency.htm | 10 |
| 40 | Relational Database Design | Finding Attribute Closure and Candidate Keys | https://www.tutorialspoint.com/dbms/finding_attribute_closure_and_candidate_keys_using_functional_dependency.htm | 10 |
| 41 | Relational Database Design | DBMS - Keys | https://www.tutorialspoint.com/dbms/keys_in_dbms.htm | 11 |
| 42 | Relational Database Design | Super keys and candidate keys | https://www.tutorialspoint.com/dbms/dbms_super_keys_and_candidate_keys.htm | 12 |
| 43 | Relational Database Design | DBMS - Foreign Key | https://www.tutorialspoint.com/dbms/dbms_foreign_key.htm | 13 |
| 44 | Relational Database Design | Finding Candidate Keys | https://www.tutorialspoint.com/dbms/finding_candidate_keys_using_functional_dependencies.htm | 10 |
| 45 | Normalization in Database Designing | Database Normalization | https://www.tutorialspoint.com/dbms/database_normalization.htm | 8 |
| 46 | Normalization in Database Designing | First Normal Form | https://www.tutorialspoint.com/dbms/dbms_first_normal_form.htm | 9 |
| 47 | Normalization in Database Designing | Second Normal Form | https://www.tutorialspoint.com/dbms/dbms_second_normal_form.htm | 15 |
| 48 | Normalization in Database Designing | Third Normal Form | https://www.tutorialspoint.com/dbms/dbms_third_normal_form.htm | 14 |
| 49 | Normalization in Database Designing | Boyce Codd Normal Form | https://www.tutorialspoint.com/dbms/dbms_boyce_codd_normal_form.htm | 13 |
| 50 | Normalization in Database Designing | Difference Between 4NF and 5NF | https://www.tutorialspoint.com/dbms/difference_between_4nf_and_5nf.htm | 13 |
| 51 | Structured Query Language | Types of Languages in SQL | https://www.tutorialspoint.com/dbms/dbms_types_of_sql_commands.htm | 17 |
| 52 | Structured Query Language | Querying in SQL | https://www.tutorialspoint.com/dbms/dbms_querying_in_sql.htm | 21 |
| 53 | Structured Query Language | CRUD Operations in SQL | https://www.tutorialspoint.com/dbms/dbms_crud_operations_in_sql.htm | 15 |
| 54 | Structured Query Language | Aggregation Function in SQL | https://www.tutorialspoint.com/dbms/dbms_aggregate_functions_in_sql.htm | 19 |
| 55 | Structured Query Language | Join and Subquery in SQL | https://www.tutorialspoint.com/dbms/dbms_join_and_subquery_in_sql.htm | 18 |
| 56 | Structured Query Language | Views in SQL | https://www.tutorialspoint.com/dbms/dbms_views_in_sql.htm | 16 |
| 57 | Structured Query Language | Trigger and Schema Modification | https://www.tutorialspoint.com/dbms/dbms_trigger_and_schema_modification.htm | 14 |
| 58 | Storage and File Structure | DBMS - Storage System | https://www.tutorialspoint.com/dbms/dbms_storage_system.htm | 10 |
| 59 | Storage and File Structure | DBMS - File Structure | https://www.tutorialspoint.com/dbms/dbms_file_structure.htm | 6 |
| 60 | Storage and File Structure | DBMS - Secondary Storage Devices | https://www.tutorialspoint.com/dbms/dbms_secondary_storage_devices.htm | 16 |
| 61 | Storage and File Structure | DBMS - Buffer and Disk Blocks | https://www.tutorialspoint.com/dbms/dbms_buffer_and_disk_blocks.htm | 9 |
| 62 | Storage and File Structure | DBMS - Placing File Records on Disk | https://www.tutorialspoint.com/dbms/dbms_placing_file_records_on_disk.htm | 13 |
| 63 | Storage and File Structure | DBMS - Ordered and Unordered Records | https://www.tutorialspoint.com/dbms/dbms_ordered_and_unordered_records.htm | 15 |
| 64 | Indexing and Hashing | DBMS - Indexing | https://www.tutorialspoint.com/dbms/dbms_indexing.htm | 7 |
| 65 | Indexing and Hashing | DBMS - Single-Level Ordered Indexing | https://www.tutorialspoint.com/dbms/dbms_single_level_ordered_indexing.htm | 12 |
| 66 | Indexing and Hashing | DBMS - Multi-level Indexing | https://www.tutorialspoint.com/dbms/dbms_multi_level_indexing.htm | 9 |
| 67 | Indexing and Hashing | Dynamic B- Tree and B+ Tree | https://www.tutorialspoint.com/dbms/dynamic_multi_level_indexing_with_b_minus_tree_and_b_plus_tree.htm | 13 |
| 68 | Indexing and Hashing | Other types of Indexing | https://www.tutorialspoint.com/dbms/other_types_of_indexing.htm | 404 |
| 69 | Indexing and Hashing | DBMS - Hashing | https://www.tutorialspoint.com/dbms/dbms_hashing.htm | 7 |
| 70 | Query Processing and Optimization | Need of Query Processing | https://www.tutorialspoint.com/dbms/need_of_query_processing.htm | 404 |
| 71 | Query Processing and Optimization | Algorithm for External Sorting | https://www.tutorialspoint.com/dbms/algorithm_for_external_sorting.htm | 404 |
| 72 | Query Processing and Optimization | Algorithms for Selection and Join Operations | https://www.tutorialspoint.com/dbms/algorithms_for_selection_and_join_operations.htm | 404 |
| 73 | Query Processing and Optimization | Algorithms for Project and Set operations | https://www.tutorialspoint.com/dbms/algorithms_for_project_and_set_operations.htm | 404 |
| 74 | Query Processing and Optimization | Heuristics in Query Processing | https://www.tutorialspoint.com/dbms/dbms_heuristics_in_query_processing.htm | 18 |
| 75 | Transaction and Concurrency | DBMS - Transaction | https://www.tutorialspoint.com/dbms/dbms_transaction.htm | 7 |
| 76 | Transaction and Concurrency | DBMS - Scheduling Transactions | https://www.tutorialspoint.com/dbms/dbms_scheduling_in_transactions.htm | 10 |
| 77 | Transaction and Concurrency | DBMS - Testing Serializability | https://www.tutorialspoint.com/dbms/dbms_testing_serializability.htm | 9 |
| 78 | Transaction and Concurrency | DBMS - Conflict Serializability | https://www.tutorialspoint.com/dbms/dbms_conflict_serializability.htm | 17 |
| 79 | Transaction and Concurrency | DBMS - View Serializability | https://www.tutorialspoint.com/dbms/dbms_view_serializability.htm | 12 |
| 80 | Transaction and Concurrency | DBMS - Concurrency Control | https://www.tutorialspoint.com/dbms/dbms_concurrency_control.htm | 8 |
| 81 | Transaction and Concurrency | DBMS - Lock Based Protocol | https://www.tutorialspoint.com/dbms/dbms_lock_based_protocol.htm | 12 |
| 82 | Transaction and Concurrency | DBMS - Timestamping based Protocol | https://www.tutorialspoint.com/dbms/dbms_timestamp_based_protocol.htm | 10 |
| 83 | Transaction and Concurrency | DBMS - Phantom Read Problem | https://www.tutorialspoint.com/dbms/dbms_phantom_read_problem.htm | 12 |
| 84 | Transaction and Concurrency | DBMS - Dirty Read Problem | https://www.tutorialspoint.com/dbms/dbms_dirty_read_problem.htm | 16 |
| 85 | Transaction and Concurrency | DBMS - Thomas Write Rule | https://www.tutorialspoint.com/dbms/dbms_thomas_write_rule.htm | 8 |
| 86 | Transaction and Concurrency | DBMS - Deadlock | https://www.tutorialspoint.com/dbms/dbms_deadlock.htm | 5 |
| 87 | Backup and Recovery | DBMS - Data Backup | https://www.tutorialspoint.com/dbms/dbms_data_backup.htm | 4 |
| 88 | Backup and Recovery | DBMS - Data Recovery | https://www.tutorialspoint.com/dbms/dbms_data_recovery.htm | 11 |
| 89 | DBMS Useful Resources | DBMS - Quick Guide | https://www.tutorialspoint.com/dbms/dbms_quick_guide.htm | 149 |
| 90 | DBMS Useful Resources | DBMS - Useful Resources | https://www.tutorialspoint.com/dbms/dbms_useful_resources.htm | 0 |
| 91 | DBMS Useful Resources | DBMS - Discussion | https://www.tutorialspoint.com/dbms/dbms_discussion.htm | 0 |

## amazonrds

Amazon - RDS · https://www.tutorialspoint.com/amazonrds/index.htm · 35 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | Amazon RDS - Home | https://www.tutorialspoint.com/amazonrds/index.htm | 0 |
| 2 | (no heading) | Amazon RDS - Overview | https://www.tutorialspoint.com/amazonrds/amazonrds_overview.htm | 0 |
| 3 | (no heading) | Amazon RDS - Environment | https://www.tutorialspoint.com/amazonrds/amazonrds_environment.htm | 3 |
| 4 | (no heading) | Amazon RDS - Interfaces | https://www.tutorialspoint.com/amazonrds/amazonrds_interfaces.htm | 4 |
| 5 | (no heading) | Amazon RDS - DB Instances | https://www.tutorialspoint.com/amazonrds/amazonrds_db_instances.htm | 0 |
| 6 | (no heading) | Amazon RDS - DB Storages | https://www.tutorialspoint.com/amazonrds/amazonrds_db_storages.htm | 0 |
| 7 | (no heading) | Amazon RDS - MS SQL features | https://www.tutorialspoint.com/amazonrds/amazonrds_ms_sql_features.htm | 0 |
| 8 | (no heading) | Amazon RDS - MS SQL creating DB | https://www.tutorialspoint.com/amazonrds/amazonrds_ms_sql_creating_db.htm | 4 |
| 9 | (no heading) | Amazon RDS - MS SQL Connecting to DB | https://www.tutorialspoint.com/amazonrds/amazonrds_ms_sql_connecting_to_db.htm | 4 |
| 10 | (no heading) | Amazon RDS - MS SQL DB Export Import | https://www.tutorialspoint.com/amazonrds/amazonrds_ms_sql_db_export_import.htm | 2 |
| 11 | (no heading) | Amazon RDS - MS SQL DB with SSL | https://www.tutorialspoint.com/amazonrds/amazonrds_ms_sql_db_with_ssl.htm | 8 |
| 12 | (no heading) | Amazon RDS - MS SQL DBA Tasks | https://www.tutorialspoint.com/amazonrds/amazonrds_ms_sql_dba_tasks.htm | 0 |
| 13 | (no heading) | Amazon RDS - Oracle Features | https://www.tutorialspoint.com/amazonrds/amazonrds_oracle_features.htm | 2 |
| 14 | (no heading) | Amazon RDS - Oracle Creating DB | https://www.tutorialspoint.com/amazonrds/amazonrds_oracle_creating_db.htm | 4 |
| 15 | (no heading) | Amazon RDS - Oracle Connecting to DB | https://www.tutorialspoint.com/amazonrds/amazonrds_oracle_connecting_to_db.htm | 3 |
| 16 | (no heading) | Amazon RDS - Oracle DB Data Import | https://www.tutorialspoint.com/amazonrds/amazonrds_oracle_db_data_import.htm | 6 |
| 17 | (no heading) | Amazon RDS - Oracle DBA Tasks | https://www.tutorialspoint.com/amazonrds/amazonrds_oracle_dba_tasks.htm | 0 |
| 18 | (no heading) | Amazon RDS - MariaDB Features | https://www.tutorialspoint.com/amazonrds/amazonrds_mariadb_features.htm | 3 |
| 19 | (no heading) | Amazon RDS - MariaDB Creating DB | https://www.tutorialspoint.com/amazonrds/amazonrds_mariadb_creating_db.htm | 5 |
| 20 | (no heading) | Amazon RDS - MariaDB Connecting to DB | https://www.tutorialspoint.com/amazonrds/amazonrds_mariadb_connecting_to_db.htm | 5 |
| 21 | (no heading) | Amazon RDS - MariaDB Data Import | https://www.tutorialspoint.com/amazonrds/amazonrds_mariadb_data_import.htm | 9 |
| 22 | (no heading) | Amazon RDS - PostgreSQL Features | https://www.tutorialspoint.com/amazonrds/amazonrds_postgressql_features.htm | 0 |
| 23 | (no heading) | Amazon RDS - PostgreSQL creating DB | https://www.tutorialspoint.com/amazonrds/amazonrds_postgressql_creating_db.htm | 5 |
| 24 | (no heading) | Amazon RDS - PostgreSQL Connecting to DB | https://www.tutorialspoint.com/amazonrds/amazonrds_postgressql_connecting_to_db.htm | 4 |
| 25 | (no heading) | Amazon RDS - PostgreSQL Data Import | https://www.tutorialspoint.com/amazonrds/amazonrds_postgressql_data_import.htm | 3 |
| 26 | (no heading) | Amazon RDS - MySQL Features | https://www.tutorialspoint.com/amazonrds/amazonrds_mysql_features.htm | 5 |
| 27 | (no heading) | Amazon RDS - MySQL Creating DB | https://www.tutorialspoint.com/amazonrds/amazonrds_mysql_creating_db.htm | 4 |
| 28 | (no heading) | Amazon RDS - MySQL Connecting to DB | https://www.tutorialspoint.com/amazonrds/amazonrds_mysql_connecting_to_db.htm | 4 |
| 29 | (no heading) | Amazon RDS - MySQL DB Export Import | https://www.tutorialspoint.com/amazonrds/amazonrds_mysql_db_export_import.htm | 9 |
| 30 | (no heading) | Amazon RDS - MySQL DBA Tasks | https://www.tutorialspoint.com/amazonrds/amazonrds_mysql_dba_tasks.htm | 2 |
| 31 | (no heading) | Amazon RDS - Multi-AZ Deployments | https://www.tutorialspoint.com/amazonrds/amazonrds_multi_az_deployments.htm | 0 |
| 32 | (no heading) | Amazon RDS - DB Snapshots | https://www.tutorialspoint.com/amazonrds/amazonrds_db_snapshots.htm | 0 |
| 33 | (no heading) | Amazon RDS - DB Monitoring | https://www.tutorialspoint.com/amazonrds/amazonrds_db_monitoring.htm | 1 |
| 34 | (no heading) | Amazon RDS - Event Notifications | https://www.tutorialspoint.com/amazonrds/amazonrds_event_notifications.htm | 3 |
| 35 | (no heading) | Amazon RDS - DB Access Control | https://www.tutorialspoint.com/amazonrds/amazonrds_db_access_control.htm | 2 |

## apache_derby

Apache Derby Tutorial · https://www.tutorialspoint.com/apache_derby/index.htm · 25 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | Apache Derby - Home | https://www.tutorialspoint.com/apache_derby/index.htm | 0 |
| 2 | (no heading) | Apache Derby - Introduction | https://www.tutorialspoint.com/apache_derby/apache_derby_introduction.htm | 4 |
| 3 | (no heading) | Apache Derby - Deployment Modes | https://www.tutorialspoint.com/apache_derby/apache_derby_deployment_modes.htm | 2 |
| 4 | (no heading) | Apache Derby - Environment Setup | https://www.tutorialspoint.com/apache_derby/apache_derby_environment_setup.htm | 9 |
| 5 | (no heading) | Apache Derby - Tools | https://www.tutorialspoint.com/apache_derby/apache_derby_tools.htm | 3 |
| 6 | (no heading) | Apache Derby - Syntax | https://www.tutorialspoint.com/apache_derby/apache_derby_syntax.htm | 21 |
| 7 | (no heading) | Apache Derby - Data Types | https://www.tutorialspoint.com/apache_derby/apache_derby_data_types.htm | 3 |
| 8 | (no heading) | Apache Derby - Create Table | https://www.tutorialspoint.com/apache_derby/apache_derby_create_table.htm | 9 |
| 9 | (no heading) | Apache Derby - Drop Table | https://www.tutorialspoint.com/apache_derby/apache_derby_drop_table.htm | 9 |
| 10 | (no heading) | Apache Derby - Insert Data | https://www.tutorialspoint.com/apache_derby/apache_derby_insert_data.htm | 13 |
| 11 | (no heading) | Apache Derby - Retrieve Data | https://www.tutorialspoint.com/apache_derby/apache_derby_retrieve_data.htm | 9 |
| 12 | (no heading) | Apache Derby - Update Data | https://www.tutorialspoint.com/apache_derby/apache_derby_update_data.htm | 9 |
| 13 | (no heading) | Apache Derby - Delete Data | https://www.tutorialspoint.com/apache_derby/apache_derby_delete_data.htm | 9 |
| 14 | (no heading) | Apache Derby - Where Clause | https://www.tutorialspoint.com/apache_derby/apache_derby_where_clause.htm | 8 |
| 15 | (no heading) | Apache Derby - GROUP BY Clause | https://www.tutorialspoint.com/apache_derby/apache_derby_group_by_clause.htm | 9 |
| 16 | (no heading) | Apache Derby - Order By Clause | https://www.tutorialspoint.com/apache_derby/apache_derby_order_by_clause.htm | 9 |
| 17 | (no heading) | Apache Derby - Having Clause | https://www.tutorialspoint.com/apache_derby/apache_derby_having_clause.htm | 9 |
| 18 | (no heading) | Alter Table Statement | https://www.tutorialspoint.com/apache_derby/apache_derby_alter_table_statement.htm | 10 |
| 19 | (no heading) | Apache Derby - Derby Indexes | https://www.tutorialspoint.com/apache_derby/apache_derby_indexes.htm | 17 |
| 20 | (no heading) | Apache Derby - Procedures | https://www.tutorialspoint.com/apache_derby/apache_derby_procedures.htm | 6 |
| 21 | (no heading) | Apache Derby - Schemas | https://www.tutorialspoint.com/apache_derby/apache_derby_schemas.htm | 8 |
| 22 | (no heading) | Apache Derby - Triggers | https://www.tutorialspoint.com/apache_derby/apache_derby_triggers.htm | 8 |
| 23 | (no heading) | Apache Derby - Quick Guide | https://www.tutorialspoint.com/apache_derby/apache_derby_quick_guide.htm | 184 |
| 24 | (no heading) | Apache Derby - Useful Resources | https://www.tutorialspoint.com/apache_derby/apache_derby_useful_resources.htm | 0 |
| 25 | (no heading) | Apache Derby - Discussion | https://www.tutorialspoint.com/apache_derby/apache_derby_discussion.htm | 0 |

## arangodb

ArangoDB Tutorial · https://www.tutorialspoint.com/arangodb/index.htm · 18 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | ArangoDB - Home | https://www.tutorialspoint.com/arangodb/index.htm | 2 |
| 2 | (no heading) | A Multi-Model First Database | https://www.tutorialspoint.com/arangodb/arangodb_multimodel_first_database.htm | 3 |
| 3 | (no heading) | ArangoDB – Advantages | https://www.tutorialspoint.com/arangodb/arangodb_advantages.htm | 7 |
| 4 | (no heading) | Basic Concepts & Terminologies | https://www.tutorialspoint.com/arangodb/arangodb_basic_concepts_and_terminologies.htm | 0 |
| 5 | (no heading) | ArangoDB – System Requirements | https://www.tutorialspoint.com/arangodb/arangodb_system_requirements.htm | 7 |
| 6 | (no heading) | ArangoDB – Command Line | https://www.tutorialspoint.com/arangodb/arangodb_command_line.htm | 1 |
| 7 | (no heading) | ArangoDB - Web Interface | https://www.tutorialspoint.com/arangodb/arangodb_web_interface.htm | 2 |
| 8 | (no heading) | ArangoDB - Example Case Scenarios | https://www.tutorialspoint.com/arangodb/arangodb_example_case_scenarios.htm | 3 |
| 9 | (no heading) | Data Models & Modeling | https://www.tutorialspoint.com/arangodb/arangodb_data_models_and_modeling.htm | 0 |
| 10 | (no heading) | ArangoDB - Database Methods | https://www.tutorialspoint.com/arangodb/arangodb_database_methods.htm | 11 |
| 11 | (no heading) | ArangoDB - Crud Operations | https://www.tutorialspoint.com/arangodb/arangodb_crud_operations.htm | 8 |
| 12 | (no heading) | Crud Operations Using Web Interface | https://www.tutorialspoint.com/arangodb/arangodb_crud_operations_using_web_interface.htm | 5 |
| 13 | (no heading) | Querying The Data With AQL | https://www.tutorialspoint.com/arangodb/arangodb_querying_data_with_aql.htm | 6 |
| 14 | (no heading) | ArangoDB - AQL Example Queries | https://www.tutorialspoint.com/arangodb/arangodb_aql_example_queries.htm | 14 |
| 15 | (no heading) | ArangoDB – How To Deploy | https://www.tutorialspoint.com/arangodb/arangodb_how_to_deploy.htm | 2 |
| 16 | (no heading) | ArangoDB - Quick Guide | https://www.tutorialspoint.com/arangodb/arangodb_quick_guide.htm | 69 |
| 17 | (no heading) | ArangoDB - Useful Resources | https://www.tutorialspoint.com/arangodb/arangodb_useful_resources.htm | 2 |
| 18 | (no heading) | ArangoDB - Discussion | https://www.tutorialspoint.com/arangodb/arangodb_discussion.htm | 0 |

## apache_presto

Apache Presto Tutorial · https://www.tutorialspoint.com/apache_presto/index.htm · 17 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | Apache Presto - Home | https://www.tutorialspoint.com/apache_presto/index.htm | 0 |
| 2 | (no heading) | Apache Presto - Overview | https://www.tutorialspoint.com/apache_presto/apache_presto_overview.htm | 5 |
| 3 | (no heading) | Apache Presto - Architecture | https://www.tutorialspoint.com/apache_presto/apache_presto_architecture.htm | 2 |
| 4 | (no heading) | Apache Presto - Installation | https://www.tutorialspoint.com/apache_presto/apache_presto_installation.htm | 18 |
| 5 | (no heading) | Apache Presto - Configuration | https://www.tutorialspoint.com/apache_presto/apache_presto_configuration_settings.htm | 10 |
| 6 | (no heading) | Apache Presto - Administration | https://www.tutorialspoint.com/apache_presto/apache_presto_administration_tools.htm | 4 |
| 7 | (no heading) | Apache Presto - SQL Operations | https://www.tutorialspoint.com/apache_presto/apache_presto_basic_sql_operations.htm | 2 |
| 8 | (no heading) | Apache Presto - SQL Functions | https://www.tutorialspoint.com/apache_presto/apache_presto_sql_functions.htm | 12 |
| 9 | (no heading) | Apache Presto - MySQL Connector | https://www.tutorialspoint.com/apache_presto/apache_presto_mysql_connector.htm | 29 |
| 10 | (no heading) | Apache Presto - JMX Connector | https://www.tutorialspoint.com/apache_presto/apache_presto_jmx_connector.htm | 13 |
| 11 | (no heading) | Apache Presto - HIVE Connector | https://www.tutorialspoint.com/apache_presto/apache_presto_hive_connector.htm | 16 |
| 12 | (no heading) | Apache Presto - KAFKA Connector | https://www.tutorialspoint.com/apache_presto/apache_presto_kafka_connector.htm | 16 |
| 13 | (no heading) | Apache Presto - JDBC Interface | https://www.tutorialspoint.com/apache_presto/apache_presto_jdbc_interface.htm | 5 |
| 14 | (no heading) | Custom Function Application | https://www.tutorialspoint.com/apache_presto/apache_presto_custom_function_application.htm | 9 |
| 15 | (no heading) | Apache Presto - Quick Guide | https://www.tutorialspoint.com/apache_presto/apache_presto_quick_guide.htm | 141 |
| 16 | (no heading) | Apache Presto - Useful Resources | https://www.tutorialspoint.com/apache_presto/apache_presto_useful_resources.htm | 0 |
| 17 | (no heading) | Apache Presto - Discussion | https://www.tutorialspoint.com/apache_presto/apache_presto_discussion.htm | 0 |

## couchdb

CouchDB Tutorial · https://www.tutorialspoint.com/couchdb/index.htm · 14 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | CouchDB - Home | https://www.tutorialspoint.com/couchdb/index.htm | 0 |
| 2 | (no heading) | CouchDB - Introduction | https://www.tutorialspoint.com/couchdb/couchdb_introduction.htm | 13 |
| 3 | (no heading) | CouchDB - Installation | https://www.tutorialspoint.com/couchdb/couchdb_installation.htm | 10 |
| 4 | (no heading) | CouchDB - Curl & Futon | https://www.tutorialspoint.com/couchdb/couchdb_curl_futon.htm | 17 |
| 5 | (no heading) | CouchDB - HTTP API | https://www.tutorialspoint.com/couchdb/couchdb_http_api.htm | 5 |
| 6 | (no heading) | CouchDB - Creating a Database | https://www.tutorialspoint.com/couchdb/couchdb_creating_a_database.htm | 4 |
| 7 | (no heading) | CouchDB - Deleting a Database | https://www.tutorialspoint.com/couchdb/couchdb_deleting_a_database.htm | 4 |
| 8 | (no heading) | CouchDB - Creating a Document | https://www.tutorialspoint.com/couchdb/couchdb_creating_a_document.htm | 6 |
| 9 | (no heading) | CouchDB - Updating a Document | https://www.tutorialspoint.com/couchdb/couchdb_updating_a_document.htm | 4 |
| 10 | (no heading) | CouchDB - Deleting a Document | https://www.tutorialspoint.com/couchdb/couchdb_deleting_a_document.htm | 4 |
| 11 | (no heading) | CouchDB - Attaching Files | https://www.tutorialspoint.com/couchdb/couchdb_attaching_files.htm | 5 |
| 12 | (no heading) | CouchDB - Quick Guide | https://www.tutorialspoint.com/couchdb/couchdb_quick_guide.htm | 72 |
| 13 | (no heading) | CouchDB - Resources | https://www.tutorialspoint.com/couchdb/couchdb_resources.htm | 0 |
| 14 | (no heading) | CouchDB - Discussion | https://www.tutorialspoint.com/couchdb/couchdb_discussion.htm | 0 |

## db2

DB2 Tutorial · https://www.tutorialspoint.com/db2/index.htm · 26 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | Home | https://www.tutorialspoint.com/db2/index.htm | 2 |
| 2 | (no heading) | DB2 - Introduction | https://www.tutorialspoint.com/db2/db2_introduction.htm | 4 |
| 3 | (no heading) | DB2 - Server Installation | https://www.tutorialspoint.com/db2/db2_server_installation.htm | 9 |
| 4 | (no heading) | DB2 - Instance | https://www.tutorialspoint.com/db2/db2_instance.htm | 21 |
| 5 | (no heading) | DB2 - Databases | https://www.tutorialspoint.com/db2/db2_databases.htm | 19 |
| 6 | (no heading) | DB2 - Bufferpools | https://www.tutorialspoint.com/db2/db2_bufferpools.htm | 6 |
| 7 | (no heading) | DB2 - Tablespaces | https://www.tutorialspoint.com/db2/db2_tablespaces.htm | 4 |
| 8 | (no heading) | DB2 - Storagegroups | https://www.tutorialspoint.com/db2/db2_storagegroups.htm | 9 |
| 9 | (no heading) | DB2 - Schemas | https://www.tutorialspoint.com/db2/db2_schemas.htm | 5 |
| 10 | (no heading) | DB2 - Data Types | https://www.tutorialspoint.com/db2/db2_data_type.htm | 2 |
| 11 | (no heading) | DB2 - Tables | https://www.tutorialspoint.com/db2/db2_tables.htm | 12 |
| 12 | (no heading) | DB2 - Alias | https://www.tutorialspoint.com/db2/db2_alias.htm | 3 |
| 13 | (no heading) | DB2 - Constraints | https://www.tutorialspoint.com/db2/db2_constraints.htm | 15 |
| 14 | (no heading) | DB2 - Indexes | https://www.tutorialspoint.com/db2/db2_indexes.htm | 4 |
| 15 | (no heading) | DB2 - Triggers | https://www.tutorialspoint.com/db2/db2_triggers.htm | 8 |
| 16 | (no heading) | DB2 - Sequences | https://www.tutorialspoint.com/db2/db2_sequences.htm | 6 |
| 17 | (no heading) | DB2 - Views | https://www.tutorialspoint.com/db2/db2_views.htm | 4 |
| 18 | (no heading) | DB2 with XML | https://www.tutorialspoint.com/db2/db2_with_xml.htm | 3 |
| 19 | (no heading) | DB2 - Backup and Recovery | https://www.tutorialspoint.com/db2/db2_backup_and_recovery.htm | 9 |
| 20 | (no heading) | DB2 - Database Security | https://www.tutorialspoint.com/db2/db2_database_security.htm | 29 |
| 21 | (no heading) | DB2 - Roles | https://www.tutorialspoint.com/db2/db2_roles.htm | 5 |
| 22 | (no heading) | DB2 - LDAP | https://www.tutorialspoint.com/db2/db2_ldap.htm | 12 |
| 23 | (no heading) | DB2 - Questions and Answers | https://www.tutorialspoint.com/db2/db2_questions_answers.htm | 0 |
| 24 | (no heading) | DB2 - Quick Guide | https://www.tutorialspoint.com/db2/db2_quick_guide.htm | 189 |
| 25 | (no heading) | DB2 - Useful Resources | https://www.tutorialspoint.com/db2/db2_useful_resources.htm | 1 |
| 26 | (no heading) | DB2 - Discussion | https://www.tutorialspoint.com/db2/db2_discussion.htm | 0 |

## documentdb_sql

DocumentDB SQL Tutorial · https://www.tutorialspoint.com/documentdb_sql/index.htm · 24 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | DocumentDB SQL - Home | https://www.tutorialspoint.com/documentdb_sql/index.htm | 0 |
| 2 | (no heading) | DocumentDB SQL - Overview | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_overview.htm | 3 |
| 3 | (no heading) | DocumentDB SQL - Select Clause | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_select_clause.htm | 0 |
| 4 | (no heading) | DocumentDB SQL - From Clause | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_from_clause.htm | 1 |
| 5 | (no heading) | DocumentDB SQL - Where Clause | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_where_clause.htm | 0 |
| 6 | (no heading) | DocumentDB SQL - Operators | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_operators.htm | 3 |
| 7 | (no heading) | DocumentDB - Between Keyword | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_between_keyword.htm | 0 |
| 8 | (no heading) | DocumentDB SQL - In Keyword | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_in_keyword.htm | 0 |
| 9 | (no heading) | DocumentDB SQL - Value Keyword | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_value_keyword.htm | 0 |
| 10 | (no heading) | DocumentDB SQL - Order By Clause | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_order_by_clause.htm | 0 |
| 11 | (no heading) | DocumentDB SQL - Iteration | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_iteration.htm | 0 |
| 12 | (no heading) | DocumentDB SQL - Joins | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_joins.htm | 0 |
| 13 | (no heading) | DocumentDB SQL - Aliasing | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_aliasing.htm | 0 |
| 14 | (no heading) | DocumentDB SQL - Array Creation | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_array_creation.htm | 0 |
| 15 | (no heading) | DocumentDB - Scalar Expressions | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_scalar_expressions.htm | 0 |
| 16 | (no heading) | DocumentDB SQL - Parameterized | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_parameterized.htm | 0 |
| 17 | (no heading) | DocumentDB SQL - Built-in Function | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_builtin_function.htm | 0 |
| 18 | (no heading) | Linq to SQL Translation | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_linq_to_sql_translation.htm | 6 |
| 19 | (no heading) | JavaScript Integration | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_javascript_integration.htm | 0 |
| 20 | (no heading) | User-Defined Functions | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_user_defined_functions.htm | 0 |
| 21 | (no heading) | Composite SQL Queries | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_composite_sql_queries.htm | 0 |
| 22 | (no heading) | DocumentDB SQL - Quick Guide | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_quick_guide.htm | 13 |
| 23 | (no heading) | DocumentDB SQL - Useful Resources | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_useful_resources.htm | 2 |
| 24 | (no heading) | DocumentDB SQL - Discussion | https://www.tutorialspoint.com/documentdb_sql/documentdb_sql_discussion.htm | 0 |

## documentdb

DocumentDB Tutorial · https://www.tutorialspoint.com/documentdb/index.htm · 28 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | DocumentDB - Home | https://www.tutorialspoint.com/documentdb/index.htm | 0 |
| 2 | (no heading) | DocumentDB - Introduction | https://www.tutorialspoint.com/documentdb/documentdb_introduction.htm | 3 |
| 3 | (no heading) | DocumentDB - Advantages | https://www.tutorialspoint.com/documentdb/documentdb_advantages.htm | 5 |
| 4 | (no heading) | DocumentDB - Environment Setup | https://www.tutorialspoint.com/documentdb/documentdb_environment_setup.htm | 1 |
| 5 | (no heading) | DocumentDB - Create Account | https://www.tutorialspoint.com/documentdb/documentdb_create_account.htm | 0 |
| 6 | (no heading) | DocumentDB - Connect Account | https://www.tutorialspoint.com/documentdb/documentdb_connect_account.htm | 4 |
| 7 | (no heading) | DocumentDB - Create Database | https://www.tutorialspoint.com/documentdb/documentdb_create_database.htm | 2 |
| 8 | (no heading) | DocumentDB - List Databases | https://www.tutorialspoint.com/documentdb/documentdb_list_databases.htm | 0 |
| 9 | (no heading) | DocumentDB - Drop Databases | https://www.tutorialspoint.com/documentdb/documentdb_drop_databases.htm | 0 |
| 10 | (no heading) | DocumentDB - Create Collection | https://www.tutorialspoint.com/documentdb/documentdb_create_collection.htm | 0 |
| 11 | (no heading) | DocumentDB - Delete Collection | https://www.tutorialspoint.com/documentdb/documentdb_delete_collection.htm | 0 |
| 12 | (no heading) | DocumentDB - Insert Document | https://www.tutorialspoint.com/documentdb/documentdb_insert_document.htm | 2 |
| 13 | (no heading) | DocumentDB - Query Document | https://www.tutorialspoint.com/documentdb/documentdb_query_document.htm | 2 |
| 14 | (no heading) | DocumentDB - Update Document | https://www.tutorialspoint.com/documentdb/documentdb_update_document.htm | 0 |
| 15 | (no heading) | DocumentDB - Delete Document | https://www.tutorialspoint.com/documentdb/documentdb_delete_document.htm | 0 |
| 16 | (no heading) | DocumentDB - Data Modeling | https://www.tutorialspoint.com/documentdb/documentdb_data_modeling.htm | 2 |
| 17 | (no heading) | DocumentDB - Data Types | https://www.tutorialspoint.com/documentdb/documentdb_data_types.htm | 0 |
| 18 | (no heading) | DocumentDB - Limiting Records | https://www.tutorialspoint.com/documentdb/documentdb_limiting_records.htm | 0 |
| 19 | (no heading) | DocumentDB - Sorting Records | https://www.tutorialspoint.com/documentdb/documentdb_sorting_records.htm | 0 |
| 20 | (no heading) | DocumentDB - Indexing Records | https://www.tutorialspoint.com/documentdb/documentdb_indexing_records.htm | 6 |
| 21 | (no heading) | DocumentDB - Geospatial Data | https://www.tutorialspoint.com/documentdb/documentdb_geospatial_data.htm | 1 |
| 22 | (no heading) | DocumentDB - Partitioning | https://www.tutorialspoint.com/documentdb/documentdb_partitioning.htm | 4 |
| 23 | (no heading) | DocumentDB - Data Migration | https://www.tutorialspoint.com/documentdb/documentdb_data_migration.htm | 0 |
| 24 | (no heading) | DocumentDB - Access Control | https://www.tutorialspoint.com/documentdb/documentdb_access_control.htm | 0 |
| 25 | (no heading) | DocumentDB - Visualize Data | https://www.tutorialspoint.com/documentdb/documentdb_visualize_data.htm | 0 |
| 26 | (no heading) | DocumentDB - Quick Guide | https://www.tutorialspoint.com/documentdb/documentdb_quick_guide.htm | 32 |
| 27 | (no heading) | DocumentDB - Useful Resources | https://www.tutorialspoint.com/documentdb/documentdb_useful_resources.htm | 2 |
| 28 | (no heading) | DocumentDB - Discussion | https://www.tutorialspoint.com/documentdb/documentdb_discussion.htm | 0 |

## hazelcast

Hazelcast Tutorial · https://www.tutorialspoint.com/hazelcast/index.htm · 17 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | Hazelcast - Home | https://www.tutorialspoint.com/hazelcast/index.htm | 0 |
| 2 | (no heading) | Hazelcast - Introduction | https://www.tutorialspoint.com/hazelcast/hazelcast_introduction.htm | 4 |
| 3 | (no heading) | Hazelcast - Setup | https://www.tutorialspoint.com/hazelcast/hazelcast_setup.htm | 2 |
| 4 | (no heading) | Hazelcast - First Application | https://www.tutorialspoint.com/hazelcast/hazelcast_first_application.htm | 4 |
| 5 | (no heading) | Hazelcast - Configuration | https://www.tutorialspoint.com/hazelcast/hazelcast_configuration.htm | 12 |
| 6 | (no heading) | Setting up multi-node instances | https://www.tutorialspoint.com/hazelcast/hazelcast_setting_up_multi_node_instances.htm | 6 |
| 7 | (no heading) | Hazelcast - Data Structures | https://www.tutorialspoint.com/hazelcast/hazelcast_data_structures.htm | 0 |
| 8 | (no heading) | Hazelcast - Client | https://www.tutorialspoint.com/hazelcast/hazelcast_client.htm | 4 |
| 9 | (no heading) | Hazelcast - Serialization | https://www.tutorialspoint.com/hazelcast/hazelcast_serialization.htm | 9 |
| 10 | Hazelcast Advanced | Hazelcast - Spring Integration | https://www.tutorialspoint.com/hazelcast/hazelcast_spring_integration.htm | 0 |
| 11 | Hazelcast Advanced | Hazelcast - Monitoring | https://www.tutorialspoint.com/hazelcast/hazelcast_monitoring.htm | 2 |
| 12 | Hazelcast Advanced | Map Reduce & Aggregations | https://www.tutorialspoint.com/hazelcast/hazelcast_map_reduce_aggregations.htm | 2 |
| 13 | Hazelcast Advanced | Hazelcast - Collection Listener | https://www.tutorialspoint.com/hazelcast/hazelcast_collection_listener.htm | 2 |
| 14 | Hazelcast Advanced | Common Pitfalls & Performance Tips | https://www.tutorialspoint.com/hazelcast/hazelcast_common_pitfalls_performance_tips.htm | 5 |
| 15 | Hazelcast Useful Resources | Hazelcast - Quick Guide | https://www.tutorialspoint.com/hazelcast/hazelcast_quick_guide.htm | 52 |
| 16 | Hazelcast Useful Resources | Hazelcast - Useful Resources | https://www.tutorialspoint.com/hazelcast/hazelcast_useful_resources.htm | 2 |
| 17 | Hazelcast Useful Resources | Hazelcast - Discussion | https://www.tutorialspoint.com/hazelcast/hazelcast_discussion.htm | 0 |

## h2_database

H2 Database Tutorial · https://www.tutorialspoint.com/h2_database/index.htm · 24 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | H2 Database - Home | https://www.tutorialspoint.com/h2_database/index.htm | 0 |
| 2 | (no heading) | H2 Database - Introduction | https://www.tutorialspoint.com/h2_database/h2_database_introduction.htm | 3 |
| 3 | (no heading) | H2 Database - Installation | https://www.tutorialspoint.com/h2_database/h2_database_installation.htm | 5 |
| 4 | (no heading) | H2 Database - Select | https://www.tutorialspoint.com/h2_database/h2_database_select.htm | 2 |
| 5 | (no heading) | H2 Database - Insert | https://www.tutorialspoint.com/h2_database/h2_database_insert.htm | 2 |
| 6 | (no heading) | H2 Database - Update | https://www.tutorialspoint.com/h2_database/h2_database_update.htm | 2 |
| 7 | (no heading) | H2 Database - Delete | https://www.tutorialspoint.com/h2_database/h2_database_delete.htm | 2 |
| 8 | (no heading) | H2 Database - Backup | https://www.tutorialspoint.com/h2_database/h2_database_backup.htm | 2 |
| 9 | (no heading) | H2 Database - Call | https://www.tutorialspoint.com/h2_database/h2_database_call.htm | 2 |
| 10 | (no heading) | H2 Database - Explain | https://www.tutorialspoint.com/h2_database/h2_database_explain.htm | 2 |
| 11 | (no heading) | H2 Database - Merge | https://www.tutorialspoint.com/h2_database/h2_database_merge.htm | 2 |
| 12 | (no heading) | H2 Database - Show | https://www.tutorialspoint.com/h2_database/h2_database_show.htm | 2 |
| 13 | H2 Database - Data Definition | H2 Database - Create | https://www.tutorialspoint.com/h2_database/h2_database_create.htm | 9 |
| 14 | H2 Database - Data Definition | H2 Database - Alter | https://www.tutorialspoint.com/h2_database/h2_database_alter.htm | 12 |
| 15 | H2 Database - Data Definition | H2 Database - Drop | https://www.tutorialspoint.com/h2_database/h2_database_drop.htm | 12 |
| 16 | H2 Database - Data Definition | H2 Database - Truncate | https://www.tutorialspoint.com/h2_database/h2_database_truncate.htm | 2 |
| 17 | H2 Database - Data Definition | H2 Database - Commit | https://www.tutorialspoint.com/h2_database/h2_database_commit.htm | 3 |
| 18 | H2 Database - Data Definition | H2 Database - Grant | https://www.tutorialspoint.com/h2_database/h2_database_grant.htm | 6 |
| 19 | H2 Database - Data Definition | H2 Database - Savepoint | https://www.tutorialspoint.com/h2_database/h2_database_savepoint.htm | 2 |
| 20 | H2 Database - Data Definition | H2 Database - Rollback | https://www.tutorialspoint.com/h2_database/h2_database_rollback.htm | 3 |
| 21 | H2 Database - Data Definition | H2 Database - JDBC Connection | https://www.tutorialspoint.com/h2_database/h2_database_jdbc_connection.htm | 5 |
| 22 | H2 Database Useful Resources | H2 Database - Quick Guide | https://www.tutorialspoint.com/h2_database/h2_database_quick_guide.htm | 80 |
| 23 | H2 Database Useful Resources | H2 Database - Useful Resources | https://www.tutorialspoint.com/h2_database/h2_database_useful_resources.htm | 0 |
| 24 | H2 Database Useful Resources | H2 Database - Discussion | https://www.tutorialspoint.com/h2_database/h2_database_discussion.htm | 0 |

## hsqldb

HSQLDB Tutorial · https://www.tutorialspoint.com/hsqldb/index.htm · 23 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | HSQLDB - Home | https://www.tutorialspoint.com/hsqldb/index.htm | 0 |
| 2 | (no heading) | HSQLDB - Introduction | https://www.tutorialspoint.com/hsqldb/hsqldb_introduction.htm | 2 |
| 3 | (no heading) | HSQLDB - Installation | https://www.tutorialspoint.com/hsqldb/hsqldb_installation.htm | 3 |
| 4 | (no heading) | HSQLDB - Connect | https://www.tutorialspoint.com/hsqldb/hsqldb_connect.htm | 1 |
| 5 | (no heading) | HSQLDB - Data Types | https://www.tutorialspoint.com/hsqldb/hsqldb_data_types.htm | 7 |
| 6 | (no heading) | HSQLDB - Create Table | https://www.tutorialspoint.com/hsqldb/hsqldb_create_table.htm | 3 |
| 7 | (no heading) | HSQLDB - Drop Table | https://www.tutorialspoint.com/hsqldb/hsqldb_drop_table.htm | 3 |
| 8 | (no heading) | HSQLDB - Insert Query | https://www.tutorialspoint.com/hsqldb/hsqldb_insert_query.htm | 3 |
| 9 | (no heading) | HSQLDB - Select Query | https://www.tutorialspoint.com/hsqldb/hsqldb_select_query.htm | 3 |
| 10 | (no heading) | HSQLDB - Where Clause | https://www.tutorialspoint.com/hsqldb/hsqldb_where_clause.htm | 3 |
| 11 | (no heading) | HSQLDB - Update Query | https://www.tutorialspoint.com/hsqldb/hsqldb_update_query.htm | 3 |
| 12 | (no heading) | HSQLDB - Delete Clause | https://www.tutorialspoint.com/hsqldb/hsqldb_delete_clause.htm | 3 |
| 13 | (no heading) | HSQLDB - Like Clause | https://www.tutorialspoint.com/hsqldb/hsqldb_like_clause.htm | 3 |
| 14 | (no heading) | HSQLDB - Sorting Results | https://www.tutorialspoint.com/hsqldb/hsqldb_sorting_results.htm | 3 |
| 15 | (no heading) | HSQLDB - Joins | https://www.tutorialspoint.com/hsqldb/hsqldb_joins.htm | 16 |
| 16 | (no heading) | HSQLDB - Null Values | https://www.tutorialspoint.com/hsqldb/hsqldb_null_values.htm | 2 |
| 17 | (no heading) | HSQLDB - Regular Expressions | https://www.tutorialspoint.com/hsqldb/hsqldb_regular_expressions.htm | 1 |
| 18 | (no heading) | HSQLDB - Transactions | https://www.tutorialspoint.com/hsqldb/hsqldb_transactions.htm | 7 |
| 19 | (no heading) | HSQLDB - Alter Command | https://www.tutorialspoint.com/hsqldb/hsqldb_alter_command.htm | 3 |
| 20 | (no heading) | HSQLDB - Indexes | https://www.tutorialspoint.com/hsqldb/hsqldb_indexes.htm | 3 |
| 21 | (no heading) | HSQLDB - Quick Guide | https://www.tutorialspoint.com/hsqldb/hsqldb_quick_guide.htm | 72 |
| 22 | (no heading) | HSQLDB - Useful Resources | https://www.tutorialspoint.com/hsqldb/hsqldb_useful_resources.htm | 2 |
| 23 | (no heading) | HSQLDB - Discussion | https://www.tutorialspoint.com/hsqldb/hsqldb_discussion.htm | 0 |

## ims_db

IMS DB Tutorial · https://www.tutorialspoint.com/ims_db/index.htm · 19 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | IMS DB - Home | https://www.tutorialspoint.com/ims_db/index.htm | 2 |
| 2 | (no heading) | IMS DB - Overview | https://www.tutorialspoint.com/ims_db/ims_db_overview.htm | 6 |
| 3 | (no heading) | IMS DB - Structure | https://www.tutorialspoint.com/ims_db/ims_db_structure.htm | 5 |
| 4 | (no heading) | IMS DB - DL/I Terminology | https://www.tutorialspoint.com/ims_db/ims_db_dli_terminology.htm | 8 |
| 5 | (no heading) | IMS DB - DL/I Processing | https://www.tutorialspoint.com/ims_db/ims_db_dli_processing.htm | 4 |
| 6 | (no heading) | IMS DB - Control Blocks | https://www.tutorialspoint.com/ims_db/ims_db_control_blocks.htm | 5 |
| 7 | (no heading) | IMS DB - Programming | https://www.tutorialspoint.com/ims_db/ims_db_programming.htm | 3 |
| 8 | (no heading) | IMS DB - Cobol Basics | https://www.tutorialspoint.com/ims_db/ims_db_cobol_basics.htm | 4 |
| 9 | (no heading) | IMS DB - DL/I Functions | https://www.tutorialspoint.com/ims_db/ims_db_dli_functions.htm | 15 |
| 10 | (no heading) | IMS DB - PCB Mask | https://www.tutorialspoint.com/ims_db/ims_db_pcb_mask.htm | 10 |
| 11 | (no heading) | IMS DB - SSA | https://www.tutorialspoint.com/ims_db/ims_db_ssa.htm | 4 |
| 12 | (no heading) | IMS DB - Data Retrieval | https://www.tutorialspoint.com/ims_db/ims_db_data_retrieval.htm | 17 |
| 13 | (no heading) | IMS DB - Data Manipulation | https://www.tutorialspoint.com/ims_db/ims_db_data_manipulation.htm | 6 |
| 14 | (no heading) | IMS DB - Secondary Indexing | https://www.tutorialspoint.com/ims_db/ims_db_secondary_indexing.htm | 9 |
| 15 | (no heading) | IMS DB - Logical Database | https://www.tutorialspoint.com/ims_db/ims_db_logical_database.htm | 9 |
| 16 | (no heading) | IMS DB - Recovery | https://www.tutorialspoint.com/ims_db/ims_db_recovery.htm | 6 |
| 17 | (no heading) | IMS DB - Questions And Answers | https://www.tutorialspoint.com/ims_db/ims_db_questions_answers.htm | 0 |
| 18 | (no heading) | IMS DB - Quick Guide | https://www.tutorialspoint.com/ims_db/ims_db_quick_guide.htm | 111 |
| 19 | (no heading) | IMS DB - Useful Resources | https://www.tutorialspoint.com/ims_db/ims_db_useful_resources.htm | 2 |

## indexeddb

IndexedDB Tutorial · https://www.tutorialspoint.com/indexeddb/index.htm · 21 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | IndexedDB - Home | https://www.tutorialspoint.com/indexeddb/index.htm | 0 |
| 2 | (no heading) | IndexedDB - Introduction | https://www.tutorialspoint.com/indexeddb/indexeddb_introduction.htm | 5 |
| 3 | (no heading) | IndexedDB - Installation | https://www.tutorialspoint.com/indexeddb/indexeddb_installation.htm | 4 |
| 4 | (no heading) | IndexedDB - Connection | https://www.tutorialspoint.com/indexeddb/indexeddb_connection.htm | 16 |
| 5 | (no heading) | IndexedDB - Object Stores | https://www.tutorialspoint.com/indexeddb/indexeddb_object_stores.htm | 18 |
| 6 | (no heading) | IndexedDB - Creating Data | https://www.tutorialspoint.com/indexeddb/indexeddb_creating_data.htm | 3 |
| 7 | (no heading) | IndexedDB - Reading Data | https://www.tutorialspoint.com/indexeddb/indexeddb_reading_data.htm | 3 |
| 8 | (no heading) | IndexedDB - Updating Data | https://www.tutorialspoint.com/indexeddb/indexeddb_updating_data.htm | 3 |
| 9 | (no heading) | IndexedDB - Deleting Data | https://www.tutorialspoint.com/indexeddb/indexeddb_deleting_data.htm | 3 |
| 10 | (no heading) | Using getAll() Functions | https://www.tutorialspoint.com/indexeddb/indexeddb_using_getall_function.htm | 3 |
| 11 | (no heading) | IndexedDB - Indexes | https://www.tutorialspoint.com/indexeddb/indexeddb_indexes.htm | 3 |
| 12 | (no heading) | IndexedDB - Ranges | https://www.tutorialspoint.com/indexeddb/indexeddb_ranges.htm | 4 |
| 13 | (no heading) | IndexedDB - Transactions | https://www.tutorialspoint.com/indexeddb/indexeddb_transactions.htm | 11 |
| 14 | (no heading) | IndexedDB - Error Handling | https://www.tutorialspoint.com/indexeddb/indexeddb_error_handling.htm | 2 |
| 15 | (no heading) | IndexedDB - Searching | https://www.tutorialspoint.com/indexeddb/indexeddb_searching.htm | 8 |
| 16 | (no heading) | IndexedDB - Cursors | https://www.tutorialspoint.com/indexeddb/indexeddb_cursors.htm | 6 |
| 17 | (no heading) | IndexedDB - Promise Wrapper | https://www.tutorialspoint.com/indexeddb/indexeddb_promise_wrapper.htm | 5 |
| 18 | (no heading) | IndexedDB - Ecmascript Binding | https://www.tutorialspoint.com/indexeddb/indexeddb_ecmascript_binding.htm | 2 |
| 19 | IndexedDB Useful Resources | IndexedDB - Quick Guide | https://www.tutorialspoint.com/indexeddb/indexeddb_quick_guide.htm | 99 |
| 20 | IndexedDB Useful Resources | IndexedDB - Useful Resources | https://www.tutorialspoint.com/indexeddb/indexeddb_useful_resources.htm | 0 |
| 21 | IndexedDB Useful Resources | IndexedDB - Discussion | https://www.tutorialspoint.com/indexeddb/indexeddb_discussion.htm | 0 |

## mariadb

MariaDB Tutorial · https://www.tutorialspoint.com/mariadb/index.htm · 36 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | MariaDB - Home | https://www.tutorialspoint.com/mariadb/index.htm | 0 |
| 2 | (no heading) | MariaDB - Introduction | https://www.tutorialspoint.com/mariadb/mariadb_introduction.htm | 4 |
| 3 | (no heading) | MariaDB - Installation | https://www.tutorialspoint.com/mariadb/mariadb_installation.htm | 6 |
| 4 | (no heading) | MariaDB - Administration | https://www.tutorialspoint.com/mariadb/mariadb_administration.htm | 3 |
| 5 | (no heading) | MariaDB - PHP Syntax | https://www.tutorialspoint.com/mariadb/mariadb_php_syntax.htm | 0 |
| 6 | (no heading) | MariaDB - Connection | https://www.tutorialspoint.com/mariadb/mariadb_connection.htm | 3 |
| 7 | (no heading) | MariaDB - Create Database | https://www.tutorialspoint.com/mariadb/mariadb_create_database.htm | 3 |
| 8 | (no heading) | MariaDB - Drop Database | https://www.tutorialspoint.com/mariadb/mariadb_drop_database.htm | 3 |
| 9 | (no heading) | MariaDB - Select Database | https://www.tutorialspoint.com/mariadb/mariadb_select_database.htm | 3 |
| 10 | (no heading) | MariaDB - Data Types | https://www.tutorialspoint.com/mariadb/mariadb_data_types.htm | 3 |
| 11 | (no heading) | MariaDB - Create Tables | https://www.tutorialspoint.com/mariadb/mariadb_create_tables.htm | 2 |
| 12 | (no heading) | MariaDB - Drop Tables | https://www.tutorialspoint.com/mariadb/mariadb_drop_tables.htm | 2 |
| 13 | (no heading) | MariaDB - Insert Query | https://www.tutorialspoint.com/mariadb/mariadb_insert_query.htm | 2 |
| 14 | (no heading) | MariaDB - Select Query | https://www.tutorialspoint.com/mariadb/mariadb_select_query.htm | 2 |
| 15 | (no heading) | MariaDB - Where Clause | https://www.tutorialspoint.com/mariadb/mariadb_where_clause.htm | 2 |
| 16 | (no heading) | MariaDB - Update Query | https://www.tutorialspoint.com/mariadb/mariadb_update_query.htm | 2 |
| 17 | (no heading) | MariaDB - Delete Query | https://www.tutorialspoint.com/mariadb/mariadb_delete_query.htm | 2 |
| 18 | (no heading) | MariaDB - Like Clause | https://www.tutorialspoint.com/mariadb/mariadb_like_clause.htm | 2 |
| 19 | (no heading) | MariaDB - Order By Clause | https://www.tutorialspoint.com/mariadb/mariadb_order_by_clause.htm | 2 |
| 20 | (no heading) | MariaDB - Join | https://www.tutorialspoint.com/mariadb/mariadb_join.htm | 2 |
| 21 | (no heading) | MariaDB - Null Values | https://www.tutorialspoint.com/mariadb/mariadb_null_values.htm | 5 |
| 22 | (no heading) | MariaDB - Regular Expression | https://www.tutorialspoint.com/mariadb/mariadb_regular_expression.htm | 0 |
| 23 | (no heading) | MariaDB - Transactions | https://www.tutorialspoint.com/mariadb/mariadb_transactions.htm | 1 |
| 24 | (no heading) | MariaDB - Alter Command | https://www.tutorialspoint.com/mariadb/mariadb_alter_command.htm | 2 |
| 25 | (no heading) | Indexes & Statistics Tables | https://www.tutorialspoint.com/mariadb/mariadb_indexes_statistics_tables.htm | 5 |
| 26 | (no heading) | MariaDB - Temporary Tables | https://www.tutorialspoint.com/mariadb/mariadb_temporary_tables.htm | 3 |
| 27 | (no heading) | MariaDB - Table Cloning | https://www.tutorialspoint.com/mariadb/mariadb_table_cloning.htm | 0 |
| 28 | (no heading) | MariaDB - Sequences | https://www.tutorialspoint.com/mariadb/mariadb_sequences.htm | 2 |
| 29 | (no heading) | MariaDB - Managing Duplicates | https://www.tutorialspoint.com/mariadb/mariadb_managing_duplicates.htm | 5 |
| 30 | (no heading) | MariaDB - SQL Injection Protection | https://www.tutorialspoint.com/mariadb/mariadb_sql_injection_protection.htm | 0 |
| 31 | (no heading) | MariaDB - Backup Methods | https://www.tutorialspoint.com/mariadb/mariadb_backup_methods.htm | 6 |
| 32 | (no heading) | MariaDB - Backup Loading Methods | https://www.tutorialspoint.com/mariadb/mariadb_backup_loading_methods.htm | 4 |
| 33 | (no heading) | MariaDB - Useful Functions | https://www.tutorialspoint.com/mariadb/mariadb_useful_functions.htm | 6 |
| 34 | (no heading) | MariaDB - Quick Guide | https://www.tutorialspoint.com/mariadb/mariadb_quick_guide.htm | 87 |
| 35 | (no heading) | MariaDB - Useful Resources | https://www.tutorialspoint.com/mariadb/mariadb_useful_resources.htm | 2 |
| 36 | (no heading) | MariaDB - Discussion | https://www.tutorialspoint.com/mariadb/mariadb_discussion.htm | 0 |

## memcached

Memcached Tutorial · https://www.tutorialspoint.com/memcached/index.htm · 23 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | Memcached - Home | https://www.tutorialspoint.com/memcached/index.htm | 0 |
| 2 | (no heading) | Memcached - Overview | https://www.tutorialspoint.com/memcached/memcached_overview.htm | 1 |
| 3 | (no heading) | Memcached - Environment | https://www.tutorialspoint.com/memcached/memcached_environment.htm | 3 |
| 4 | (no heading) | Memcached - Connection | https://www.tutorialspoint.com/memcached/memcached_connection.htm | 5 |
| 5 | (no heading) | Memcached - Set Data | https://www.tutorialspoint.com/memcached/memcached_set_data.htm | 6 |
| 6 | (no heading) | Memcached - Add Data | https://www.tutorialspoint.com/memcached/memcached_add_data.htm | 7 |
| 7 | (no heading) | Memcached - Replace Data | https://www.tutorialspoint.com/memcached/memcached_replace_data.htm | 6 |
| 8 | (no heading) | Memcached - Append Data | https://www.tutorialspoint.com/memcached/memcached_append_data.htm | 6 |
| 9 | (no heading) | Memcached - Prepend Data | https://www.tutorialspoint.com/memcached/memcached_prepend_data.htm | 6 |
| 10 | (no heading) | Memcached - CAS | https://www.tutorialspoint.com/memcached/memcached_cas.htm | 6 |
| 11 | Memcached Retrieval Commands | Memcached - Get Data | https://www.tutorialspoint.com/memcached/memcached_get_data.htm | 5 |
| 12 | Memcached Retrieval Commands | Memcached - Get CAS Data | https://www.tutorialspoint.com/memcached/memcached_get_cas_data.htm | 5 |
| 13 | Memcached Retrieval Commands | Memcached - Delete Key | https://www.tutorialspoint.com/memcached/memcached_delete_key.htm | 6 |
| 14 | Memcached Retrieval Commands | Memcached - Delete Data | https://www.tutorialspoint.com/memcached/memcached_delete_data.htm | 5 |
| 15 | Memcached Retrieval Commands | Memcached - Incr/Decr | https://www.tutorialspoint.com/memcached/memcached_incr_decr.htm | 7 |
| 16 | Memcached Statistics Commands | Memcached - Stats | https://www.tutorialspoint.com/memcached/memcached_stats.htm | 5 |
| 17 | Memcached Statistics Commands | Memcached - Stats Items | https://www.tutorialspoint.com/memcached/memcached_stats_items.htm | 2 |
| 18 | Memcached Statistics Commands | Memcached - Stats Slabs | https://www.tutorialspoint.com/memcached/memcached_stats_slabs.htm | 2 |
| 19 | Memcached Statistics Commands | Memcached - Stats sizes | https://www.tutorialspoint.com/memcached/memcached_stats_sizes.htm | 2 |
| 20 | Memcached Statistics Commands | Memcached - Clear Data | https://www.tutorialspoint.com/memcached/memcached_clear_data.htm | 5 |
| 21 | Memcached Useful Resources | Memcached - Quick Guide | https://www.tutorialspoint.com/memcached/memcached_quick_guide.htm | 90 |
| 22 | Memcached Useful Resources | Memcached - Useful Resources | https://www.tutorialspoint.com/memcached/memcached_useful_resources.htm | 2 |
| 23 | Memcached Useful Resources | Memcached - Discussion | https://www.tutorialspoint.com/memcached/memcached_discussion.htm | 0 |

## java_mysql

Java & MySQL Tutorial · https://www.tutorialspoint.com/java_mysql/index.htm · 35 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | Java & MySQL - Home | https://www.tutorialspoint.com/java_mysql/index.htm | 0 |
| 2 | (no heading) | Java & MySQL - Overview | https://www.tutorialspoint.com/java_mysql/java_mysql_overview.htm | 4 |
| 3 | (no heading) | Java & MySQL - Environment Setup | https://www.tutorialspoint.com/java_mysql/java_mysql_environment.htm | 15 |
| 4 | (no heading) | Java & MySQL - Sample Code | https://www.tutorialspoint.com/java_mysql/java_mysql_sample_code.htm | 2 |
| 5 | (no heading) | Java & MySQL - Connections | https://www.tutorialspoint.com/java_mysql/java_mysql_connections.htm | 6 |
| 6 | (no heading) | Java & MySQL - Exceptions | https://www.tutorialspoint.com/java_mysql/java_mysql_exceptions.htm | 2 |
| 7 | Java & MySQL Statements | Java & MySQL - Statement | https://www.tutorialspoint.com/java_mysql/java_mysql_statement.htm | 1 |
| 8 | Java & MySQL Statements | Java & MySQL - PreparedStatement | https://www.tutorialspoint.com/java_mysql/java_mysql_prepared_statement.htm | 2 |
| 9 | Java & MySQL Statements | Java & MySQL - CallableStatement | https://www.tutorialspoint.com/java_mysql/java_mysql_callable_statement.htm | 7 |
| 10 | Java & MySQL Result | Java & MySQL - Result Set | https://www.tutorialspoint.com/java_mysql/java_mysql_result_set.htm | 2 |
| 11 | Java & MySQL Result | Java & MySQL - Navigate Result Set | https://www.tutorialspoint.com/java_mysql/java_mysql_result_set_navigate.htm | 0 |
| 12 | Java & MySQL Result | Java & MySQL - View Result Set | https://www.tutorialspoint.com/java_mysql/java_mysql_result_set_view.htm | 0 |
| 13 | Java & MySQL Result | Java & MySQL - Update Result Set | https://www.tutorialspoint.com/java_mysql/java_mysql_result_set_update.htm | 1 |
| 14 | Java & MySQL Transactions | Java & MySQL - Transactions | https://www.tutorialspoint.com/java_mysql/java_mysql_transactions.htm | 2 |
| 15 | Java & MySQL Transactions | Java & MySQL - Commit & Rollback | https://www.tutorialspoint.com/java_mysql/java_mysql_transactions_commit.htm | 0 |
| 16 | Java & MySQL Transactions | Java & MySQL - SavePoint Transactions | https://www.tutorialspoint.com/java_mysql/java_mysql_transactions_savepoint.htm | 0 |
| 17 | Java & MySQL Batch Processing | Java & MySQL - Batch Processing | https://www.tutorialspoint.com/java_mysql/java_mysql_batch_processing.htm | 3 |
| 18 | Java & MySQL Batch Processing | Batch Processing - Statement | https://www.tutorialspoint.com/java_mysql/java_mysql_batch_processing_statement.htm | 0 |
| 19 | Java & MySQL Batch Processing | Batch Processing - PreparedStatement | https://www.tutorialspoint.com/java_mysql/java_mysql_batch_processing_preparedstatement.htm | 0 |
| 20 | Java & MySQL Streaming | Java & MySQL - Streaming Data | https://www.tutorialspoint.com/java_mysql/java_mysql_streaming_data.htm | 0 |
| 21 | Java & MySQL Examples | Java & MySQL - Create Database | https://www.tutorialspoint.com/java_mysql/java_mysql_create_database.htm | 2 |
| 22 | Java & MySQL Examples | Java & MySQL - Select Database | https://www.tutorialspoint.com/java_mysql/java_mysql_select_database.htm | 2 |
| 23 | Java & MySQL Examples | Java & MySQL - Drop Database | https://www.tutorialspoint.com/java_mysql/java_mysql_drop_database.htm | 2 |
| 24 | Java & MySQL Examples | Java & MySQL - Create Tables | https://www.tutorialspoint.com/java_mysql/java_mysql_create_tables.htm | 2 |
| 25 | Java & MySQL Examples | Java & MySQL - Drop Tables | https://www.tutorialspoint.com/java_mysql/java_mysql_drop_tables.htm | 2 |
| 26 | Java & MySQL Examples | Java & MySQL - Insert Records | https://www.tutorialspoint.com/java_mysql/java_mysql_insert_records.htm | 2 |
| 27 | Java & MySQL Examples | Java & MySQL - Select Records | https://www.tutorialspoint.com/java_mysql/java_mysql_select_records.htm | 2 |
| 28 | Java & MySQL Examples | Java & MySQL - Update Records | https://www.tutorialspoint.com/java_mysql/java_mysql_update_records.htm | 2 |
| 29 | Java & MySQL Examples | Java & MySQL - Delete Records | https://www.tutorialspoint.com/java_mysql/java_mysql_delete_records.htm | 2 |
| 30 | Java & MySQL Examples | Java & MySQL - Where Clause | https://www.tutorialspoint.com/java_mysql/java_mysql_where_clause.htm | 2 |
| 31 | Java & MySQL Examples | Java & MySQL - Like Clause | https://www.tutorialspoint.com/java_mysql/java_mysql_like_clause.htm | 2 |
| 32 | Java & MySQL Examples | Java & MySQL - Sorting Data | https://www.tutorialspoint.com/java_mysql/java_mysql_sorting_data.htm | 2 |
| 33 | Java & MySQL Useful Resources | Java & MySQL - Quick Guide | https://www.tutorialspoint.com/java_mysql/java_mysql_quick_guide.htm | 71 |
| 34 | Java & MySQL Useful Resources | Java & MySQL - Useful Resources | https://www.tutorialspoint.com/java_mysql/java_mysql_useful_resources.htm | 2 |
| 35 | Java & MySQL Useful Resources | Java & MySQL - Discussion | https://www.tutorialspoint.com/java_mysql/java_mysql_discussion.htm | 0 |

## php_mongodb

PHP & MongoDB Tutorial · https://www.tutorialspoint.com/php_mongodb/index.htm · 20 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | PHP & MongoDB - Home | https://www.tutorialspoint.com/php_mongodb/index.htm | 2 |
| 2 | (no heading) | PHP & MongoDB - Overview | https://www.tutorialspoint.com/php_mongodb/php_mongodb_overview.htm | 1 |
| 3 | (no heading) | PHP & MongoDB - Environment Setup | https://www.tutorialspoint.com/php_mongodb/php_mongodb_environment.htm | 8 |
| 4 | PHP & MongoDB Examples | PHP & MongoDB - Connect Database | https://www.tutorialspoint.com/php_mongodb/php_mongodb_connect_database.htm | 3 |
| 5 | PHP & MongoDB Examples | PHP & MongoDB - Show Databases | https://www.tutorialspoint.com/php_mongodb/php_mongodb_show_databases.htm | 3 |
| 6 | PHP & MongoDB Examples | PHP & MongoDB - Drop Database | https://www.tutorialspoint.com/php_mongodb/php_mongodb_drop_database.htm | 3 |
| 7 | PHP & MongoDB Examples | PHP & MongoDB - Create Collection | https://www.tutorialspoint.com/php_mongodb/php_mongodb_create_collection.htm | 3 |
| 8 | PHP & MongoDB Examples | PHP & MongoDB - Drop Collection | https://www.tutorialspoint.com/php_mongodb/php_mongodb_drop_collection.htm | 3 |
| 9 | PHP & MongoDB Examples | PHP & MongoDB - Display Collections | https://www.tutorialspoint.com/php_mongodb/php_mongodb_display_collections.htm | 3 |
| 10 | PHP & MongoDB Examples | PHP & MongoDB - Insert Document | https://www.tutorialspoint.com/php_mongodb/php_mongodb_insert_document.htm | 6 |
| 11 | PHP & MongoDB Examples | PHP & MongoDB - Select Document | https://www.tutorialspoint.com/php_mongodb/php_mongodb_select_document.htm | 9 |
| 12 | PHP & MongoDB Examples | PHP & MongoDB - Update Document | https://www.tutorialspoint.com/php_mongodb/php_mongodb_update_document.htm | 6 |
| 13 | PHP & MongoDB Examples | PHP & MongoDB - Delete Document | https://www.tutorialspoint.com/php_mongodb/php_mongodb_delete_document.htm | 9 |
| 14 | PHP & MongoDB Examples | PHP & MongoDB - Embedded Documents | https://www.tutorialspoint.com/php_mongodb/php_mongodb_embedded_document.htm | 3 |
| 15 | PHP & MongoDB Examples | PHP & MongoDB - Error Handling | https://www.tutorialspoint.com/php_mongodb/php_mongodb_error_handling.htm | 3 |
| 16 | PHP & MongoDB Examples | PHP & MongoDB - Limiting Records | https://www.tutorialspoint.com/php_mongodb/php_mongodb_limit_records.htm | 3 |
| 17 | PHP & MongoDB Examples | PHP & MongoDB - Sorting Records | https://www.tutorialspoint.com/php_mongodb/php_mongodb_sorting_records.htm | 5 |
| 18 | PHP & MongoDB Useful Resources | PHP & MongoDB - Quick Guide | https://www.tutorialspoint.com/php_mongodb/php_mongodb_quick_guide.htm | 71 |
| 19 | PHP & MongoDB Useful Resources | PHP & MongoDB - Useful Resources | https://www.tutorialspoint.com/php_mongodb/php_mongodb_useful_resources.htm | 2 |
| 20 | PHP & MongoDB Useful Resources | PHP & MongoDB - Discussion | https://www.tutorialspoint.com/php_mongodb/php_mongodb_discussion.htm | 0 |

## php_mysql

PHP & MySQL Tutorial · https://www.tutorialspoint.com/php_mysql/index.htm · 24 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | PHP & MySQL - Home | https://www.tutorialspoint.com/php_mysql/index.htm | 0 |
| 2 | (no heading) | PHP & MySQL - Overview | https://www.tutorialspoint.com/php_mysql/php_mysql_overview.htm | 0 |
| 3 | (no heading) | PHP & MySQL - Environment Setup | https://www.tutorialspoint.com/php_mysql/php_mysql_environment.htm | 16 |
| 4 | PHP & MySQL Examples | PHP & MySQL - Connect Database | https://www.tutorialspoint.com/php_mysql/php_mysql_connect_database.htm | 4 |
| 5 | PHP & MySQL Examples | PHP & MySQL - Create Database | https://www.tutorialspoint.com/php_mysql/php_mysql_create_database.htm | 3 |
| 6 | PHP & MySQL Examples | PHP & MySQL - Drop Database | https://www.tutorialspoint.com/php_mysql/php_mysql_drop_database.htm | 3 |
| 7 | PHP & MySQL Examples | PHP & MySQL - Select Database | https://www.tutorialspoint.com/php_mysql/php_mysql_select_database.htm | 3 |
| 8 | PHP & MySQL Examples | PHP & MySQL - Create Tables | https://www.tutorialspoint.com/php_mysql/php_mysql_create_tables.htm | 3 |
| 9 | PHP & MySQL Examples | PHP & MySQL - Drop Tables | https://www.tutorialspoint.com/php_mysql/php_mysql_drop_tables.htm | 3 |
| 10 | PHP & MySQL Examples | PHP & MySQL - Insert Records | https://www.tutorialspoint.com/php_mysql/php_mysql_insert_records.htm | 3 |
| 11 | PHP & MySQL Examples | PHP & MySQL - Select Records | https://www.tutorialspoint.com/php_mysql/php_mysql_select_records.htm | 2 |
| 12 | PHP & MySQL Examples | PHP & MySQL - Update Records | https://www.tutorialspoint.com/php_mysql/php_mysql_update_records.htm | 3 |
| 13 | PHP & MySQL Examples | PHP & MySQL - Delete Records | https://www.tutorialspoint.com/php_mysql/php_mysql_delete_records.htm | 3 |
| 14 | PHP & MySQL Examples | PHP & MySQL - Where Clause | https://www.tutorialspoint.com/php_mysql/php_mysql_where_clause.htm | 3 |
| 15 | PHP & MySQL Examples | PHP & MySQL - Like Clause | https://www.tutorialspoint.com/php_mysql/php_mysql_like_clause.htm | 3 |
| 16 | PHP & MySQL Examples | PHP & MySQL - Sorting Data | https://www.tutorialspoint.com/php_mysql/php_mysql_sorting_data.htm | 3 |
| 17 | PHP & MySQL Examples | PHP & MySQL - Using Joins | https://www.tutorialspoint.com/php_mysql/php_mysql_using_joins.htm | 3 |
| 18 | PHP & MySQL Examples | PHP & MySQL - Handling NULL | https://www.tutorialspoint.com/php_mysql/php_mysql_handling_null.htm | 2 |
| 19 | PHP & MySQL Examples | PHP & MySQL - Database Info | https://www.tutorialspoint.com/php_mysql/php_mysql_database_info.htm | 2 |
| 20 | PHP & MySQL Examples | PHP & MySQL - Using Sequence | https://www.tutorialspoint.com/php_mysql/php_mysql_using_sequence.htm | 404 |
| 21 | PHP & MySQL Examples | PHP & MySQL - SQL Injection | https://www.tutorialspoint.com/php_mysql/php_mysql_sql_injection.htm | 404 |
| 22 | PHP & MySQL Useful Resources | PHP & MySQL - Quick Guide | https://www.tutorialspoint.com/php_mysql/php_mysql_quick_guide.htm | 62 |
| 23 | PHP & MySQL Useful Resources | PHP & MySQL - Useful Resources | https://www.tutorialspoint.com/php_mysql/php_mysql_useful_resources.htm | 2 |
| 24 | PHP & MySQL Useful Resources | PHP & MySQL - Discussion | https://www.tutorialspoint.com/php_mysql/php_mysql_discussion.htm | 0 |

## mysqli

MySQLi Tutorial · https://www.tutorialspoint.com/mysqli/index.htm · 34 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | MySQLi - Home | https://www.tutorialspoint.com/mysqli/index.htm | 2 |
| 2 | (no heading) | MySQLi - Introduction | https://www.tutorialspoint.com/mysqli/mysqli_introduction.htm | 2 |
| 3 | (no heading) | MySQLi - PHP Syntax | https://www.tutorialspoint.com/mysqli/mysqli_php_syntax.htm | 0 |
| 4 | (no heading) | MySQLi - Connection | https://www.tutorialspoint.com/mysqli/mysqli_connection.htm | 7 |
| 5 | (no heading) | MySQLi - Create Database | https://www.tutorialspoint.com/mysqli/mysqli_create_database.htm | 6 |
| 6 | (no heading) | MySQLi - Drop Database | https://www.tutorialspoint.com/mysqli/mysqli_drop_database.htm | 5 |
| 7 | (no heading) | MySQLi - Select Database | https://www.tutorialspoint.com/mysqli/mysqli_select_database.htm | 6 |
| 8 | (no heading) | MySQLi - Create Tables | https://www.tutorialspoint.com/mysqli/mysqli_create_tables.htm | 7 |
| 9 | (no heading) | MySQLi - Drop Tables | https://www.tutorialspoint.com/mysqli/mysqli_drop_tables.htm | 7 |
| 10 | (no heading) | MySQLi - Insert Query | https://www.tutorialspoint.com/mysqli/mysqli_insert_query.htm | 7 |
| 11 | (no heading) | MySQLi - Select Query | https://www.tutorialspoint.com/mysqli/mysqli_select_query.htm | 7 |
| 12 | (no heading) | MySQLi - Where Clause | https://www.tutorialspoint.com/mysqli/mysqli_where_clause.htm | 7 |
| 13 | (no heading) | MySQLi - Update Query | https://www.tutorialspoint.com/mysqli/mysqli_update_query.htm | 7 |
| 14 | (no heading) | MySQLi - Delete Query | https://www.tutorialspoint.com/mysqli/mysqli_delete_query.htm | 7 |
| 15 | (no heading) | MySQLi - Like Clause | https://www.tutorialspoint.com/mysqli/mysqli_like_clause.htm | 7 |
| 16 | (no heading) | MySQLi - Sorting Results | https://www.tutorialspoint.com/mysqli/mysqli_sorting_results.htm | 7 |
| 17 | (no heading) | MySQLi - Using Joins | https://www.tutorialspoint.com/mysqli/mysqli_using_joins.htm | 8 |
| 18 | (no heading) | MySQLi - Handling NULL Values | https://www.tutorialspoint.com/mysqli/mysqli_handling_null_values.htm | 5 |
| 19 | (no heading) | Obtaining & Using MySQLi Metadata | https://www.tutorialspoint.com/mysqli/obtaining_using_mysqli_metadata.htm | 9 |
| 20 | (no heading) | MySQL - Installation | https://www.tutorialspoint.com/mysqli/mysqli_installation.htm | 8 |
| 21 | (no heading) | MySQL - Administration | https://www.tutorialspoint.com/mysqli/mysqli_administration.htm | 4 |
| 22 | (no heading) | MySQL - Data Types | https://www.tutorialspoint.com/mysqli/mysqli_data_types.htm | 3 |
| 23 | (no heading) | MySQL - Regexps | https://www.tutorialspoint.com/mysqli/mysqli_regexps.htm | 1 |
| 24 | (no heading) | MySQL - Transactions | https://www.tutorialspoint.com/mysqli/mysqli_transactions.htm | 4 |
| 25 | (no heading) | MySQL - Alter Command | https://www.tutorialspoint.com/mysqli/mysqli_alter_command.htm | 6 |
| 26 | (no heading) | MySQL - Indexes | https://www.tutorialspoint.com/mysqli/mysqli_indexes.htm | 4 |
| 27 | (no heading) | MySQL - Temporary Tables | https://www.tutorialspoint.com/mysqli/mysqli_temporary_tables.htm | 2 |
| 28 | (no heading) | MySQL - Clone Tables | https://www.tutorialspoint.com/mysqli/mysqli_clone_tables.htm | 4 |
| 29 | (no heading) | MySQL - Using Sequences | https://www.tutorialspoint.com/mysqli/mysqli_using_sequences.htm | 7 |
| 30 | (no heading) | MySQL - Handling Duplicates | https://www.tutorialspoint.com/mysqli/mysqli_handling_duplicates.htm | 4 |
| 31 | MySQLi Useful Resources | MySQLi - Useful Functions | https://www.tutorialspoint.com/mysqli/mysqli_useful_functions.htm | 0 |
| 32 | MySQLi Useful Resources | MySQLi - Quick Guide | https://www.tutorialspoint.com/mysqli/mysqli_quick_guide.htm | 158 |
| 33 | MySQLi Useful Resources | MySQLi - Useful Resources | https://www.tutorialspoint.com/mysqli/mysqli_useful_resources.htm | 1 |
| 34 | MySQLi Useful Resources | MySQLi - Discussion | https://www.tutorialspoint.com/mysqli/mysqli_discussion.htm | 0 |

## neo4j

Neo4j Tutorial · https://www.tutorialspoint.com/neo4j/index.htm · 32 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | Neo4j - Home | https://www.tutorialspoint.com/neo4j/index.htm | 0 |
| 2 | (no heading) | Neo4j - Overview | https://www.tutorialspoint.com/neo4j/neo4j_overview.htm | 6 |
| 3 | (no heading) | Neo4j - Data Model | https://www.tutorialspoint.com/neo4j/neo4j_data_model.htm | 1 |
| 4 | (no heading) | Neo4j - Environment Setup | https://www.tutorialspoint.com/neo4j/neo4j_environment_setup.htm | 3 |
| 5 | (no heading) | Neo4j - Building Blocks | https://www.tutorialspoint.com/neo4j/neo4j_building_blocks.htm | 7 |
| 6 | (no heading) | Neo4j CQL - Introduction | https://www.tutorialspoint.com/neo4j/neo4j_cql_introduction.htm | 8 |
| 7 | (no heading) | Neo4j CQL - Creating Nodes | https://www.tutorialspoint.com/neo4j/neo4j_cql_creating_nodes.htm | 29 |
| 8 | (no heading) | Neo4j CQL - Creating a Relationship | https://www.tutorialspoint.com/neo4j/neo4j_cql_creating_relationship.htm | 16 |
| 9 | Neo4j CQL Write Clauses | Neo4j - Merge Command | https://www.tutorialspoint.com/neo4j/neo4j_merge_command.htm | 18 |
| 10 | Neo4j CQL Write Clauses | Neo4j - Set Clause | https://www.tutorialspoint.com/neo4j/neo4j_set_clause.htm | 20 |
| 11 | Neo4j CQL Write Clauses | Neo4j - Delete Clause | https://www.tutorialspoint.com/neo4j/neo4j_delete_clause.htm | 6 |
| 12 | Neo4j CQL Write Clauses | Neo4j - Remove Clause | https://www.tutorialspoint.com/neo4j/neo4j_remove_clause.htm | 12 |
| 13 | Neo4j CQL Write Clauses | Neo4j - Foreach Clause | https://www.tutorialspoint.com/neo4j/neo4j_foreach_clause.htm | 4 |
| 14 | Neo4j CQL Read Clause | Neo4j - Match Clause | https://www.tutorialspoint.com/neo4j/neo4j_match_clause.htm | 14 |
| 15 | Neo4j CQL Read Clause | Neo4j - Optional Match Clause | https://www.tutorialspoint.com/neo4j/neo4j_optional_match_clause.htm | 3 |
| 16 | Neo4j CQL Read Clause | Neo4j - Where Clause | https://www.tutorialspoint.com/neo4j/neo4j_where_clause.htm | 10 |
| 17 | Neo4j CQL Read Clause | Neo4j - Count Function | https://www.tutorialspoint.com/neo4j/neo4j_count_function.htm | 7 |
| 18 | Neo4j CQL General Clauses | Neo4j - Return Clause | https://www.tutorialspoint.com/neo4j/neo4j_return_clause.htm | 22 |
| 19 | Neo4j CQL General Clauses | Neo4j - Order By Clause | https://www.tutorialspoint.com/neo4j/neo4j_order_by_clause.htm | 11 |
| 20 | Neo4j CQL General Clauses | Neo4j - Limit Clause | https://www.tutorialspoint.com/neo4j/neo4j_limit_clause.htm | 6 |
| 21 | Neo4j CQL General Clauses | Neo4j - Skip Clause | https://www.tutorialspoint.com/neo4j/neo4j_skip_clause.htm | 5 |
| 22 | Neo4j CQL General Clauses | Neo4j - With Clause | https://www.tutorialspoint.com/neo4j/neo4j_with_clause.htm | 3 |
| 23 | Neo4j CQL General Clauses | Neo4j - Unwind Clause | https://www.tutorialspoint.com/neo4j/neo4j_unwind_clause.htm | 2 |
| 24 | Neo4j CQL Functions | Neo4j - String Functions | https://www.tutorialspoint.com/neo4j/neo4j_string_functions.htm | 1 |
| 25 | Neo4j CQL Functions | Neo4j - Aggregation Function | https://www.tutorialspoint.com/neo4j/neo4j_aggregation_function.htm | 1 |
| 26 | Neo4j CQL Admin | Neo4j - Backup & Restore | https://www.tutorialspoint.com/neo4j/neo4j_backup_and_restore.htm | 2 |
| 27 | Neo4j CQL Admin | Neo4j - Index | https://www.tutorialspoint.com/neo4j/neo4j_index.htm | 8 |
| 28 | Neo4j CQL Admin | Neo4j - Create Unique Constraint | https://www.tutorialspoint.com/neo4j/neo4j_create_unique_constraint.htm | 5 |
| 29 | Neo4j CQL Admin | Neo4j - Drop Unique | https://www.tutorialspoint.com/neo4j/neo4j_drop_unique.htm | 3 |
| 30 | Neo4j Useful Resources | Neo4j - Quick Guide | https://www.tutorialspoint.com/neo4j/neo4j_quick_guide.htm | 232 |
| 31 | Neo4j Useful Resources | Neo4j - Useful Resources | https://www.tutorialspoint.com/neo4j/neo4j_useful_resources.htm | 0 |
| 32 | Neo4j Useful Resources | Neo4j - Discussion | https://www.tutorialspoint.com/neo4j/neo4j_discussion.htm | 0 |

## obiee

OBIEE Tutorial · https://www.tutorialspoint.com/obiee/index.htm · 27 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | OBIEE - Home | https://www.tutorialspoint.com/obiee/index.htm | 0 |
| 2 | (no heading) | OBIEE - Data Warehouse | https://www.tutorialspoint.com/obiee/obiee_data_warehouse.htm | 9 |
| 3 | (no heading) | OBIEE - Dimensional Modeling | https://www.tutorialspoint.com/obiee/obiee_dimensional_modeling.htm | 7 |
| 4 | (no heading) | OBIEE - Schema | https://www.tutorialspoint.com/obiee/obiee_schema.htm | 13 |
| 5 | (no heading) | OBIEE - Basics | https://www.tutorialspoint.com/obiee/obiee_basics.htm | 4 |
| 6 | (no heading) | OBIEE - Components | https://www.tutorialspoint.com/obiee/obiee_components.htm | 8 |
| 7 | (no heading) | OBIEE - Architecture | https://www.tutorialspoint.com/obiee/obiee_architecture.htm | 10 |
| 8 | (no heading) | OBIEE - Repositories | https://www.tutorialspoint.com/obiee/obiee_repositories.htm | 21 |
| 9 | (no heading) | OBIEE - Business Layer | https://www.tutorialspoint.com/obiee/obiee_business_layer.htm | 13 |
| 10 | (no heading) | OBIEE - Presentation Layer | https://www.tutorialspoint.com/obiee/obiee_presentation_layer.htm | 6 |
| 11 | (no heading) | OBIEE - Testing Repository | https://www.tutorialspoint.com/obiee/obiee_testing_repository.htm | 7 |
| 12 | (no heading) | OBIEE - Multiple Logical Table | https://www.tutorialspoint.com/obiee/obiee_multiple_logical_table_sources.htm | 1 |
| 13 | (no heading) | OBIEE - Calculation Measures | https://www.tutorialspoint.com/obiee/obiee_calculation_measures.htm | 3 |
| 14 | (no heading) | OBIEE - Dimension Hierarchies | https://www.tutorialspoint.com/obiee/obiee_dimension_hierarchies.htm | 5 |
| 15 | (no heading) | OBIEE - Level-Based Measures | https://www.tutorialspoint.com/obiee/obiee_level_based_measures.htm | 1 |
| 16 | (no heading) | OBIEE - Aggregates | https://www.tutorialspoint.com/obiee/obiee_aggregates.htm | 2 |
| 17 | (no heading) | OBIEE - Variables | https://www.tutorialspoint.com/obiee/obiee_variables.htm | 11 |
| 18 | (no heading) | OBIEE - Dashboards | https://www.tutorialspoint.com/obiee/obiee_dashboards.htm | 4 |
| 19 | (no heading) | OBIEE - Filters | https://www.tutorialspoint.com/obiee/obiee_filters.htm | 3 |
| 20 | (no heading) | OBIEE - Views | https://www.tutorialspoint.com/obiee/obiee_views.htm | 4 |
| 21 | (no heading) | OBIEE - Prompts | https://www.tutorialspoint.com/obiee/obiee_prompts.htm | 9 |
| 22 | (no heading) | OBIEE - Security | https://www.tutorialspoint.com/obiee/obiee_security.htm | 10 |
| 23 | (no heading) | OBIEE - Administration | https://www.tutorialspoint.com/obiee/obiee_administration.htm | 14 |
| 24 | (no heading) | OBIEE - Questions Answers | https://www.tutorialspoint.com/obiee/obiee_questions_answers.htm | 0 |
| 25 | (no heading) | OBIEE - Quick Guide | https://www.tutorialspoint.com/obiee/obiee_quick_guide.htm | 165 |
| 26 | (no heading) | OBIEE - Useful Resources | https://www.tutorialspoint.com/obiee/obiee_useful_resources.htm | 2 |
| 27 | (no heading) | OBIEE - Discussion | https://www.tutorialspoint.com/obiee/obiee_discussion.htm | 0 |

## orientdb

OrientDB Tutorial · https://www.tutorialspoint.com/orientdb/index.htm · 64 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | OrientDB - Home | https://www.tutorialspoint.com/orientdb/index.htm | 0 |
| 2 | (no heading) | OrientDB - Overview | https://www.tutorialspoint.com/orientdb/orientdb_overview.htm | 1 |
| 3 | (no heading) | OrientDB - Installation | https://www.tutorialspoint.com/orientdb/orientdb_installation.htm | 11 |
| 4 | (no heading) | OrientDB - Basic Concepts | https://www.tutorialspoint.com/orientdb/orientdb_basic_concepts.htm | 14 |
| 5 | (no heading) | OrientDB - Data Types | https://www.tutorialspoint.com/orientdb/orientdb_data_types.htm | 0 |
| 6 | (no heading) | OrientDB - Console Modes | https://www.tutorialspoint.com/orientdb/orientdb_console_modes.htm | 4 |
| 7 | (no heading) | OrientDB - Create Database | https://www.tutorialspoint.com/orientdb/orientdb_create_database.htm | 1 |
| 8 | (no heading) | OrientDB - Alter Database | https://www.tutorialspoint.com/orientdb/orientdb_alter_database.htm | 1 |
| 9 | (no heading) | OrientDB - Backup Database | https://www.tutorialspoint.com/orientdb/orientdb_backup_database.htm | 2 |
| 10 | (no heading) | OrientDB - Restore Database | https://www.tutorialspoint.com/orientdb/orientdb_restore_database.htm | 1 |
| 11 | (no heading) | OrientDB - Connect Database | https://www.tutorialspoint.com/orientdb/orientdb_connect_database.htm | 1 |
| 12 | (no heading) | OrientDB - Disconnect Database | https://www.tutorialspoint.com/orientdb/orientdb_disconnect_database.htm | 1 |
| 13 | (no heading) | OrientDB - Info Database | https://www.tutorialspoint.com/orientdb/orientdb_info_database.htm | 1 |
| 14 | (no heading) | OrientDB - List Database | https://www.tutorialspoint.com/orientdb/orientdb_list_database.htm | 1 |
| 15 | (no heading) | OrientDB - Freeze Database | https://www.tutorialspoint.com/orientdb/orientdb_freeze_database.htm | 1 |
| 16 | (no heading) | OrientDB - Release Database | https://www.tutorialspoint.com/orientdb/orientdb_release_database.htm | 1 |
| 17 | (no heading) | OrientDB - Config Database | https://www.tutorialspoint.com/orientdb/orientdb_config_database.htm | 5 |
| 18 | (no heading) | OrientDB - Export Database | https://www.tutorialspoint.com/orientdb/orientdb_export_database.htm | 1 |
| 19 | (no heading) | OrientDB - Import Database | https://www.tutorialspoint.com/orientdb/orientdb_import_database.htm | 1 |
| 20 | (no heading) | OrientDB - Commit Database | https://www.tutorialspoint.com/orientdb/orientdb_commit_database.htm | 1 |
| 21 | (no heading) | OrientDB - Rollback Database | https://www.tutorialspoint.com/orientdb/orientdb_rollback_database.htm | 1 |
| 22 | (no heading) | OrientDB - Optimize Database | https://www.tutorialspoint.com/orientdb/orientdb_optimize_database.htm | 1 |
| 23 | (no heading) | OrientDB - Drop Database | https://www.tutorialspoint.com/orientdb/orientdb_drop_database.htm | 1 |
| 24 | OrientDB Record Commands | OrientDB - Insert Record | https://www.tutorialspoint.com/orientdb/orientdb_insert_record.htm | 1 |
| 25 | OrientDB Record Commands | OrientDB - Display Records | https://www.tutorialspoint.com/orientdb/orientdb_display_records.htm | 1 |
| 26 | OrientDB Record Commands | OrientDB - Load Record | https://www.tutorialspoint.com/orientdb/orientdb_load_record.htm | 1 |
| 27 | OrientDB Record Commands | OrientDB - Reload Record | https://www.tutorialspoint.com/orientdb/orientdb_reload_record.htm | 1 |
| 28 | OrientDB Record Commands | OrientDB - Export Record | https://www.tutorialspoint.com/orientdb/orientdb_export_record.htm | 1 |
| 29 | OrientDB Record Commands | OrientDB - Update Record | https://www.tutorialspoint.com/orientdb/orientdb_update_record.htm | 1 |
| 30 | OrientDB Record Commands | OrientDB - Truncate Record | https://www.tutorialspoint.com/orientdb/orientdb_truncate_record.htm | 1 |
| 31 | OrientDB Record Commands | OrientDB - Delete Record | https://www.tutorialspoint.com/orientdb/orientdb_delete_record.htm | 1 |
| 32 | OrientDB Class Commands | OrientDB - Create Class | https://www.tutorialspoint.com/orientdb/orientdb_create_class.htm | 1 |
| 33 | OrientDB Class Commands | OrientDB - Alter Class | https://www.tutorialspoint.com/orientdb/orientdb_alter_class.htm | 1 |
| 34 | OrientDB Class Commands | OrientDB - Truncate Class | https://www.tutorialspoint.com/orientdb/orientdb_truncate_class.htm | 1 |
| 35 | OrientDB Class Commands | OrientDB - Drop Class | https://www.tutorialspoint.com/orientdb/orientdb_drop_class.htm | 1 |
| 36 | OrientDB Cluster Commands | OrientDB - Create Cluster | https://www.tutorialspoint.com/orientdb/orientdb_create_cluster.htm | 1 |
| 37 | OrientDB Cluster Commands | OrientDB - Alter Cluster | https://www.tutorialspoint.com/orientdb/orientdb_alter_cluster.htm | 1 |
| 38 | OrientDB Cluster Commands | OrientDB - Truncate Cluster | https://www.tutorialspoint.com/orientdb/orientdb_truncate_cluster.htm | 1 |
| 39 | OrientDB Cluster Commands | OrientDB - Drop Cluster | https://www.tutorialspoint.com/orientdb/orientdb_drop_cluster.htm | 1 |
| 40 | OrientDB Property Commands | OrientDB - Create Property | https://www.tutorialspoint.com/orientdb/orientdb_create_property.htm | 1 |
| 41 | OrientDB Property Commands | OrientDB - Alter Property | https://www.tutorialspoint.com/orientdb/orientdb_alter_property.htm | 1 |
| 42 | OrientDB Property Commands | OrientDB - Drop Property | https://www.tutorialspoint.com/orientdb/orientdb_drop_property.htm | 1 |
| 43 | OrientDB Vertex Commands | OrientDB - Create Vertex | https://www.tutorialspoint.com/orientdb/orientdb_create_vertex.htm | 1 |
| 44 | OrientDB Vertex Commands | OrientDB - Move Vertex | https://www.tutorialspoint.com/orientdb/orientdb_move_vertex.htm | 1 |
| 45 | OrientDB Vertex Commands | OrientDB - Delete Vertex | https://www.tutorialspoint.com/orientdb/orientdb_delete_vertex.htm | 1 |
| 46 | OrientDB Edge Commands | OrientDB - Create Edge | https://www.tutorialspoint.com/orientdb/orientdb_create_edge.htm | 1 |
| 47 | OrientDB Edge Commands | OrientDB - Update Edge | https://www.tutorialspoint.com/orientdb/orientdb_update_edge.htm | 1 |
| 48 | OrientDB Edge Commands | OrientDB - Delete Edge | https://www.tutorialspoint.com/orientdb/orientdb_delete_edge.htm | 1 |
| 49 | OrientDB Advanced Concepts | OrientDB - Functions | https://www.tutorialspoint.com/orientdb/orientdb_functions.htm | 4 |
| 50 | OrientDB Advanced Concepts | OrientDB - Sequences | https://www.tutorialspoint.com/orientdb/orientdb_sequences.htm | 3 |
| 51 | OrientDB Advanced Concepts | OrientDB - Indexes | https://www.tutorialspoint.com/orientdb/orientdb_indexes.htm | 8 |
| 52 | OrientDB Advanced Concepts | OrientDB - Transactions | https://www.tutorialspoint.com/orientdb/orientdb_transactions.htm | 4 |
| 53 | OrientDB Advanced Concepts | OrientDB - Hooks | https://www.tutorialspoint.com/orientdb/orientdb_hooks.htm | 11 |
| 54 | OrientDB Advanced Concepts | OrientDB - Caching | https://www.tutorialspoint.com/orientdb/orientdb_caching.htm | 3 |
| 55 | OrientDB Advanced Concepts | OrientDB - Logging | https://www.tutorialspoint.com/orientdb/orientdb_logging.htm | 10 |
| 56 | OrientDB Advanced Concepts | OrientDB - Performance Tuning | https://www.tutorialspoint.com/orientdb/orientdb_performance_tuning.htm | 12 |
| 57 | OrientDB Advanced Concepts | OrientDB - Upgrading | https://www.tutorialspoint.com/orientdb/orientdb_upgrading.htm | 2 |
| 58 | OrientDB Advanced Concepts | OrientDB - Security | https://www.tutorialspoint.com/orientdb/orientdb_security.htm | 9 |
| 59 | OrientDB Advanced Concepts | OrientDB - Studio | https://www.tutorialspoint.com/orientdb/orientdb_studio.htm | 23 |
| 60 | OrientDB Interfaces | OrientDB - Java Interface | https://www.tutorialspoint.com/orientdb/orientdb_java_interface.htm | 1 |
| 61 | OrientDB Interfaces | OrientDB - Python Interface | https://www.tutorialspoint.com/orientdb/orientdb_python_interface.htm | 0 |
| 62 | OrientDB Useful Resources | OrientDB - Quick Guide | https://www.tutorialspoint.com/orientdb/orientdb_quick_guide.htm | 167 |
| 63 | OrientDB Useful Resources | OrientDB - Useful Resources | https://www.tutorialspoint.com/orientdb/orientdb_useful_resources.htm | 0 |
| 64 | OrientDB Useful Resources | OrientDB - Discussion | https://www.tutorialspoint.com/orientdb/orientdb_discussion.htm | 0 |

## phpmyadmin

phpMyAdmin Tutorial · https://www.tutorialspoint.com/phpmyadmin/index.htm · 22 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | phpMyAdmin - Home | https://www.tutorialspoint.com/phpmyadmin/index.htm | 0 |
| 2 | (no heading) | phpMyAdmin - Overview | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_overview.htm | 1 |
| 3 | (no heading) | phpMyAdmin - Environment Setup | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_environment.htm | 10 |
| 4 | (no heading) | phpMyAdmin - Features | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_features.htm | 0 |
| 5 | (no heading) | phpMyAdmin - Pros & Cons | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_pros_cons.htm | 2 |
| 6 | (no heading) | phpMyAdmin vs MySQL Workbench | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_mysql_workbench.htm | 0 |
| 7 | phpMyAdmin Sections | phpMyAdmin - Databases | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_databases.htm | 3 |
| 8 | phpMyAdmin Sections | phpMyAdmin - SQL | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_sql.htm | 0 |
| 9 | phpMyAdmin Sections | phpMyAdmin - Status | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_status.htm | 0 |
| 10 | phpMyAdmin Sections | phpMyAdmin - User Accounts | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_user_accounts.htm | 0 |
| 11 | phpMyAdmin Sections | phpMyAdmin - Export | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_exports.htm | 0 |
| 12 | phpMyAdmin Sections | phpMyAdmin - Import | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_import.htm | 0 |
| 13 | phpMyAdmin Sections | phpMyAdmin - Settings | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_settings.htm | 0 |
| 14 | phpMyAdmin Sections | phpMyAdmin - Binary Logs | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_binary_logs.htm | 0 |
| 15 | phpMyAdmin Sections | phpMyAdmin - Replication | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_replication.htm | 0 |
| 16 | phpMyAdmin Sections | phpMyAdmin - Variables | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_variables.htm | 0 |
| 17 | phpMyAdmin Sections | phpMyAdmin - Charsets | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_charsets.htm | 0 |
| 18 | phpMyAdmin Sections | phpMyAdmin - Engines | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_storage_engines.htm | 0 |
| 19 | phpMyAdmin Sections | phpMyAdmin - Plugins | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_plugins.htm | 0 |
| 20 | phpMyAdmin Useful Resources | phpMyAdmin - Quick Guide | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_quick_guide.htm | 16 |
| 21 | phpMyAdmin Useful Resources | phpMyAdmin - Useful Resources | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_useful_resources.htm | 2 |
| 22 | phpMyAdmin Useful Resources | phpMyAdmin - Discussion | https://www.tutorialspoint.com/phpmyadmin/phpmyadmin_discussion.htm | 0 |

## plsql

PL/SQL Tutorial · https://www.tutorialspoint.com/plsql/index.htm · 28 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | PL/SQL - Home | https://www.tutorialspoint.com/plsql/index.htm | 10 |
| 2 | (no heading) | PL/SQL - Overview | https://www.tutorialspoint.com/plsql/plsql_overview.htm | 2 |
| 3 | (no heading) | PL/SQL - Environment | https://www.tutorialspoint.com/plsql/plsql_environment_setup.htm | 13 |
| 4 | (no heading) | PL/SQL - Basic Syntax | https://www.tutorialspoint.com/plsql/plsql_basic_syntax.htm | 5 |
| 5 | (no heading) | PL/SQL - Data Types | https://www.tutorialspoint.com/plsql/plsql_data_types.htm | 8 |
| 6 | (no heading) | PL/SQL - Variables | https://www.tutorialspoint.com/plsql/plsql_variable_types.htm | 4 |
| 7 | (no heading) | PL/SQL - Constants and Literals | https://www.tutorialspoint.com/plsql/plsql_constants.htm | 2 |
| 8 | (no heading) | PL/SQL - Operators | https://www.tutorialspoint.com/plsql/plsql_operators.htm | 5 |
| 9 | (no heading) | PL/SQL - Conditions | https://www.tutorialspoint.com/plsql/plsql_conditional_control.htm | 0 |
| 10 | (no heading) | PL/SQL - Loops | https://www.tutorialspoint.com/plsql/plsql_loops.htm | 2 |
| 11 | (no heading) | PL/SQL - Strings | https://www.tutorialspoint.com/plsql/plsql_strings.htm | 4 |
| 12 | (no heading) | PL/SQL - Arrays | https://www.tutorialspoint.com/plsql/plsql_arrays.htm | 3 |
| 13 | (no heading) | PL/SQL - Procedures | https://www.tutorialspoint.com/plsql/plsql_procedures.htm | 12 |
| 14 | (no heading) | PL/SQL - Functions | https://www.tutorialspoint.com/plsql/plsql_functions.htm | 5 |
| 15 | (no heading) | PL/SQL - Cursors | https://www.tutorialspoint.com/plsql/plsql_cursors.htm | 8 |
| 16 | (no heading) | PL/SQL - Records | https://www.tutorialspoint.com/plsql/plsql_records.htm | 6 |
| 17 | (no heading) | PL/SQL - Exceptions | https://www.tutorialspoint.com/plsql/plsql_exceptions.htm | 6 |
| 18 | (no heading) | PL/SQL - Triggers | https://www.tutorialspoint.com/plsql/plsql_triggers.htm | 4 |
| 19 | (no heading) | PL/SQL - Packages | https://www.tutorialspoint.com/plsql/plsql_packages.htm | 7 |
| 20 | (no heading) | PL/SQL - Collections | https://www.tutorialspoint.com/plsql/plsql_collections.htm | 8 |
| 21 | (no heading) | PL/SQL - Transactions | https://www.tutorialspoint.com/plsql/plsql_transactions.htm | 5 |
| 22 | (no heading) | PL/SQL - Date & Time | https://www.tutorialspoint.com/plsql/plsql_date_time.htm | 9 |
| 23 | (no heading) | PL/SQL - DBMS Output | https://www.tutorialspoint.com/plsql/plsql_dbms_output.htm | 2 |
| 24 | (no heading) | PL/SQL - Object Oriented | https://www.tutorialspoint.com/plsql/plsql_object_oriented.htm | 8 |
| 25 | (no heading) | PL/SQL - Questions and Answers | https://www.tutorialspoint.com/plsql/plsql_questions_answers.htm | 0 |
| 26 | (no heading) | PL/SQL - Quick Guide | https://www.tutorialspoint.com/plsql/plsql_quick_guide.htm | 128 |
| 27 | (no heading) | PL/SQL - Useful Resources | https://www.tutorialspoint.com/plsql/plsql_useful_resources.htm | 2 |
| 28 | (no heading) | PL/SQL - Discussion | https://www.tutorialspoint.com/plsql/plsql_discussion.htm | 0 |

## pouchdb

PouchDB Tutorial · https://www.tutorialspoint.com/pouchdb/index.htm · 23 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | PouchDB - Home | https://www.tutorialspoint.com/pouchdb/index.htm | 1 |
| 2 | (no heading) | PouchDB - Overview | https://www.tutorialspoint.com/pouchdb/pouchdb_overview.htm | 5 |
| 3 | (no heading) | PouchDB - Environment | https://www.tutorialspoint.com/pouchdb/pouchdb_environment.htm | 12 |
| 4 | (no heading) | PouchDB - Create Database | https://www.tutorialspoint.com/pouchdb/pouchdb_create_database.htm | 2 |
| 5 | (no heading) | PouchDB - Database Info | https://www.tutorialspoint.com/pouchdb/pouchdb_database_info.htm | 4 |
| 6 | (no heading) | PouchDB - Delete Database | https://www.tutorialspoint.com/pouchdb/pouchdb_delete_database.htm | 5 |
| 7 | (no heading) | PouchDB - Create Document | https://www.tutorialspoint.com/pouchdb/pouchdb_create_document.htm | 5 |
| 8 | (no heading) | PouchDB - Read Document | https://www.tutorialspoint.com/pouchdb/pouchdb_read_document.htm | 4 |
| 9 | (no heading) | PouchDB - Update Document | https://www.tutorialspoint.com/pouchdb/pouchdb_update_document.htm | 3 |
| 10 | (no heading) | PouchDB - Delete Document | https://www.tutorialspoint.com/pouchdb/pouchdb_delete_document.htm | 4 |
| 11 | (no heading) | PouchDB - Create Batch | https://www.tutorialspoint.com/pouchdb/pouchdb_create_batch.htm | 5 |
| 12 | (no heading) | PouchDB - Fetch Batch | https://www.tutorialspoint.com/pouchdb/pouchdb_fetch_batch.htm | 4 |
| 13 | (no heading) | PouchDB - Update Batch | https://www.tutorialspoint.com/pouchdb/pouchdb_update_batch.htm | 2 |
| 14 | (no heading) | PouchDB - Delete Batch | https://www.tutorialspoint.com/pouchdb/pouchdb_delete_batch.htm | 2 |
| 15 | (no heading) | PouchDB - Adding Attachment | https://www.tutorialspoint.com/pouchdb/pouchdb_adding_attachment.htm | 5 |
| 16 | (no heading) | PouchDB - Retrieving Attachment | https://www.tutorialspoint.com/pouchdb/pouchdb_retrieving_attachment.htm | 4 |
| 17 | (no heading) | PouchDB - Deleting Attachment | https://www.tutorialspoint.com/pouchdb/pouchdb_deleting_attachment.htm | 4 |
| 18 | (no heading) | PouchDB - Replication | https://www.tutorialspoint.com/pouchdb/pouchdb_replication.htm | 3 |
| 19 | (no heading) | PouchDB - Synchronization | https://www.tutorialspoint.com/pouchdb/pouchdb_synchronization.htm | 1 |
| 20 | (no heading) | PouchDB - Miscellaneous | https://www.tutorialspoint.com/pouchdb/pouchdb_miscellaneous.htm | 2 |
| 21 | (no heading) | PouchDB - Quick Guide | https://www.tutorialspoint.com/pouchdb/pouchdb_quick_guide.htm | 76 |
| 22 | (no heading) | PouchDB - Useful Resources | https://www.tutorialspoint.com/pouchdb/pouchdb_useful_resources.htm | 0 |
| 23 | (no heading) | PouchDB - Discussion | https://www.tutorialspoint.com/pouchdb/pouchdb_discussion.htm | 0 |

## redis

Redis Tutorial · https://www.tutorialspoint.com/redis/index.htm · 29 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | Redis - Home | https://www.tutorialspoint.com/redis/index.htm | 0 |
| 2 | (no heading) | Redis - Overview | https://www.tutorialspoint.com/redis/redis_overview.htm | 2 |
| 3 | (no heading) | Redis - Environment | https://www.tutorialspoint.com/redis/redis_environment.htm | 4 |
| 4 | (no heading) | Redis - Configuration | https://www.tutorialspoint.com/redis/redis_configuration.htm | 6 |
| 5 | (no heading) | Redis - Data types | https://www.tutorialspoint.com/redis/redis_data_types.htm | 10 |
| 6 | (no heading) | Redis - Commands | https://www.tutorialspoint.com/redis/redis_commands.htm | 5 |
| 7 | (no heading) | Redis - Keys | https://www.tutorialspoint.com/redis/redis_keys.htm | 3 |
| 8 | (no heading) | Redis - Strings | https://www.tutorialspoint.com/redis/redis_strings.htm | 3 |
| 9 | (no heading) | Redis - Hashes | https://www.tutorialspoint.com/redis/redis_hashes.htm | 2 |
| 10 | (no heading) | Redis - Lists | https://www.tutorialspoint.com/redis/redis_lists.htm | 2 |
| 11 | (no heading) | Redis - Sets | https://www.tutorialspoint.com/redis/redis_sets.htm | 2 |
| 12 | (no heading) | Redis - Sorted Sets | https://www.tutorialspoint.com/redis/redis_sorted_sets.htm | 2 |
| 13 | (no heading) | Redis - HyperLogLog | https://www.tutorialspoint.com/redis/redis_hyperloglog.htm | 2 |
| 14 | (no heading) | Redis - Publish Subscribe | https://www.tutorialspoint.com/redis/redis_pub_sub.htm | 2 |
| 15 | (no heading) | Redis - Transactions | https://www.tutorialspoint.com/redis/redis_transactions.htm | 3 |
| 16 | (no heading) | Redis - Scripting | https://www.tutorialspoint.com/redis/redis_scripting.htm | 3 |
| 17 | (no heading) | Redis - Connections | https://www.tutorialspoint.com/redis/redis_connection.htm | 2 |
| 18 | (no heading) | Redis - Server | https://www.tutorialspoint.com/redis/redis_server.htm | 2 |
| 19 | Redis Advanced | Redis - Backup | https://www.tutorialspoint.com/redis/redis_backup.htm | 5 |
| 20 | Redis Advanced | Redis - Security | https://www.tutorialspoint.com/redis/redis_security.htm | 3 |
| 21 | Redis Advanced | Redis - Benchmarks | https://www.tutorialspoint.com/redis/redis_benchmarks.htm | 3 |
| 22 | Redis Advanced | Redis - Client Connection | https://www.tutorialspoint.com/redis/redis_client_connection.htm | 3 |
| 23 | Redis Advanced | Redis - Pipelining | https://www.tutorialspoint.com/redis/redis_pipelining.htm | 3 |
| 24 | Redis Advanced | Redis - Partitioning | https://www.tutorialspoint.com/redis/redis_partitioning.htm | 5 |
| 25 | Redis Advanced | Redis - Java | https://www.tutorialspoint.com/redis/redis_java.htm | 5 |
| 26 | Redis Advanced | Redis - Php | https://www.tutorialspoint.com/redis/redis_php.htm | 5 |
| 27 | Redis Useful Resources | Redis - Quick Guide | https://www.tutorialspoint.com/redis/redis_quick_guide.htm | 87 |
| 28 | Redis Useful Resources | Redis - Useful Resources | https://www.tutorialspoint.com/redis/redis_useful_resources.htm | 0 |
| 29 | Redis Useful Resources | Redis - Discussion | https://www.tutorialspoint.com/redis/redis_discussion.htm | 0 |

## sqlalchemy

SQLAlchemy Tutorial · https://www.tutorialspoint.com/sqlalchemy/index.htm · 40 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | SQLAlchemy - Home | https://www.tutorialspoint.com/sqlalchemy/index.htm | 0 |
| 2 | (no heading) | SQLAlchemy - Introduction | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_introduction.htm | 2 |
| 3 | (no heading) | Expression Language | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_expression_language.htm | 0 |
| 4 | (no heading) | Connecting to Database | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_connecting_to_database.htm | 0 |
| 5 | (no heading) | Creating Table | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_creating_table.htm | 0 |
| 6 | (no heading) | SQL Expressions | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_sql_expressions.htm | 0 |
| 7 | (no heading) | Executing Expression | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_executing_expression.htm | 0 |
| 8 | (no heading) | Selecting Rows | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_selecting_rows.htm | 0 |
| 9 | (no heading) | Using Textual SQL | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_using_textual_sql.htm | 0 |
| 10 | (no heading) | Using Aliases | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_using_aliases.htm | 0 |
| 11 | (no heading) | Using UPDATE Expression | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_using_update_expression.htm | 0 |
| 12 | (no heading) | Using DELETE Expression | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_using_delete_expression.htm | 0 |
| 13 | (no heading) | Using Multiple Tables | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_using_multiple_tables.htm | 0 |
| 14 | (no heading) | Using Multiple Table Updates | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_using_multiple_table_updates.htm | 0 |
| 15 | (no heading) | Parameter-Ordered Updates | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_parameterordered_updates.htm | 0 |
| 16 | (no heading) | Multiple Table Deletes | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_multiple_table_deletes.htm | 0 |
| 17 | (no heading) | Using Joins | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_using_joins.htm | 0 |
| 18 | (no heading) | Using Conjunctions | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_using_conjunctions.htm | 5 |
| 19 | (no heading) | Using Functions | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_using_functions.htm | 0 |
| 20 | (no heading) | Using Set Operations | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_core_using_set_operations.htm | 4 |
| 21 | SQLAlchemy ORM | Declaring Mapping | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_declaring_mapping.htm | 1 |
| 22 | SQLAlchemy ORM | Creating Session | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_creating_session.htm | 0 |
| 23 | SQLAlchemy ORM | Adding Objects | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_adding_objects.htm | 0 |
| 24 | SQLAlchemy ORM | Using Query | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_using_query.htm | 0 |
| 25 | SQLAlchemy ORM | Updating Objects | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_updating_objects.htm | 0 |
| 26 | SQLAlchemy ORM | Applying Filter | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_applying_filter.htm | 0 |
| 27 | SQLAlchemy ORM | Filter Operators | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_filter_operators.htm | 6 |
| 28 | SQLAlchemy ORM | Returning List and Scalars | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_returning_list_and_scalars.htm | 4 |
| 29 | SQLAlchemy ORM | Textual SQL | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_textual_sql.htm | 0 |
| 30 | SQLAlchemy ORM | Building Relationship | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_building_relationship.htm | 4 |
| 31 | SQLAlchemy ORM | Working with Related Objects | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_working_with_related_objects.htm | 0 |
| 32 | SQLAlchemy ORM | Working with Joins | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_working_with_joins.htm | 0 |
| 33 | SQLAlchemy ORM | Common Relationship Operators | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_common_relationship_operators.htm | 5 |
| 34 | SQLAlchemy ORM | Eager Loading | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_eager_loading.htm | 2 |
| 35 | SQLAlchemy ORM | Deleting Related Objects | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_deleting_related_objects.htm | 0 |
| 36 | SQLAlchemy ORM | Many to Many Relationships | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_orm_many_to_many_relationships.htm | 0 |
| 37 | SQLAlchemy ORM | Dialects | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_dialects.htm | 6 |
| 38 | SQLAlchemy Useful Resources | SQLAlchemy - Quick Guide | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_quick_guide.htm | 39 |
| 39 | SQLAlchemy Useful Resources | SQLAlchemy - Useful Resources | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_useful_resources.htm | 2 |
| 40 | SQLAlchemy Useful Resources | SQLAlchemy - Discussion | https://www.tutorialspoint.com/sqlalchemy/sqlalchemy_discussion.htm | 0 |

## t_sql

T-SQL Tutorial · https://www.tutorialspoint.com/t_sql/index.htm · 26 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | T-SQL - Home | https://www.tutorialspoint.com/t_sql/index.htm | 0 |
| 2 | (no heading) | T-SQL - Overview | https://www.tutorialspoint.com/t_sql/t_sql_overview.htm | 1 |
| 3 | (no heading) | T-SQL - Data Types | https://www.tutorialspoint.com/t_sql/t_sql_data_types.htm | 7 |
| 4 | (no heading) | T-SQL - Create Tables | https://www.tutorialspoint.com/t_sql/t_sql_create_tables.htm | 2 |
| 5 | (no heading) | T-SQL - Drop Tables | https://www.tutorialspoint.com/t_sql/t_sql_drop_tables.htm | 2 |
| 6 | (no heading) | T-SQL - INSERT Statement | https://www.tutorialspoint.com/t_sql/t_sql_insert_statement.htm | 4 |
| 7 | (no heading) | T-SQL - SELECT Statement | https://www.tutorialspoint.com/t_sql/t_sql_select_statement.htm | 2 |
| 8 | (no heading) | T-SQL - UPDATE Statement | https://www.tutorialspoint.com/t_sql/t_sql_update_statement.htm | 2 |
| 9 | (no heading) | T-SQL - DELETE Statement | https://www.tutorialspoint.com/t_sql/t_sql_delete_statement.htm | 2 |
| 10 | (no heading) | T-SQL - WHERE Clause | https://www.tutorialspoint.com/t_sql/t_sql_where_clause.htm | 2 |
| 11 | (no heading) | T-SQL - LIKE Clause | https://www.tutorialspoint.com/t_sql/t_sql_like_clause.htm | 2 |
| 12 | (no heading) | T-SQL - ORDER BY Clause | https://www.tutorialspoint.com/t_sql/t_sql_order_by_clause.htm | 2 |
| 13 | (no heading) | T-SQL - GROUP BY Clause | https://www.tutorialspoint.com/t_sql/t_sql_group_by_clause.htm | 2 |
| 14 | (no heading) | T-SQL - DISTINCT Clause | https://www.tutorialspoint.com/t_sql/t_sql_distinct_clause.htm | 2 |
| 15 | (no heading) | T-SQL - Joining Tables | https://www.tutorialspoint.com/t_sql/t_sql_joining_tables.htm | 0 |
| 16 | (no heading) | T-SQL - Sub-Queries | https://www.tutorialspoint.com/t_sql/t_sql_sub_queries.htm | 12 |
| 17 | (no heading) | T-SQL - Stored Procedures | https://www.tutorialspoint.com/t_sql/t_sql_stored_procedures.htm | 2 |
| 18 | (no heading) | T-SQL - Transactions | https://www.tutorialspoint.com/t_sql/t_sql_transactions.htm | 13 |
| 19 | (no heading) | T-SQL - Indexes | https://www.tutorialspoint.com/t_sql/t_sql_indexes.htm | 15 |
| 20 | (no heading) | T-SQL - Functions | https://www.tutorialspoint.com/t_sql/t_sql_functions.htm | 0 |
| 21 | (no heading) | T-SQL - String Functions | https://www.tutorialspoint.com/t_sql/t_sql_string_functions.htm | 50 |
| 22 | (no heading) | T-SQL - Date Functions | https://www.tutorialspoint.com/t_sql/t_sql_date_functions.htm | 15 |
| 23 | (no heading) | T-SQL - Numeric Functions | https://www.tutorialspoint.com/t_sql/t_sql_numeric_functions.htm | 27 |
| 24 | (no heading) | T-SQL - Quick Guide | https://www.tutorialspoint.com/t_sql/t_sql_quick_guide.htm | 166 |
| 25 | (no heading) | T-SQL - Useful Resources | https://www.tutorialspoint.com/t_sql/t_sql_useful_resources.htm | 0 |
| 26 | (no heading) | T-SQL - Discussion | https://www.tutorialspoint.com/t_sql/t_sql_discussion.htm | 0 |

## tinydb

TinyDB Tutorial · https://www.tutorialspoint.com/tinydb/index.htm · 34 chapters

| # | Section | Chapter | URL | Headings |
|---|---|---|---|---|
| 1 | (no heading) | TinyDB - Home | https://www.tutorialspoint.com/tinydb/index.htm | 0 |
| 2 | (no heading) | TinyDB - Introduction | https://www.tutorialspoint.com/tinydb/tinydb_introduction.htm | 5 |
| 3 | (no heading) | TinyDB - Environmental Setup | https://www.tutorialspoint.com/tinydb/tinydb_environmental_setup.htm | 9 |
| 4 | (no heading) | TinyDB - Insert Data | https://www.tutorialspoint.com/tinydb/tinydb_insert_data.htm | 3 |
| 5 | (no heading) | TinyDB - Retrieve Data | https://www.tutorialspoint.com/tinydb/tinydb_retrieve_data.htm | 4 |
| 6 | (no heading) | TinyDB - Update Data | https://www.tutorialspoint.com/tinydb/tinydb_update_data.htm | 1 |
| 7 | (no heading) | TinyDB - Delete Data | https://www.tutorialspoint.com/tinydb/tinydb_delete_data.htm | 5 |
| 8 | (no heading) | TinyDB - Querying | https://www.tutorialspoint.com/tinydb/tinydb_querying.htm | 4 |
| 9 | (no heading) | TinyDB - Searching | https://www.tutorialspoint.com/tinydb/tinydb_searching.htm | 9 |
| 10 | (no heading) | TinyDB - The where Clause | https://www.tutorialspoint.com/tinydb/tinydb_where_clause.htm | 3 |
| 11 | (no heading) | TinyDB - The Exists() Query | https://www.tutorialspoint.com/tinydb/tinydb_exists_query.htm | 4 |
| 12 | (no heading) | TinyDB - The Matches() Query | https://www.tutorialspoint.com/tinydb/tinydb_matches_query.htm | 5 |
| 13 | (no heading) | TinyDB - The Test() Query | https://www.tutorialspoint.com/tinydb/tinydb_test_query.htm | 3 |
| 14 | (no heading) | TinyDB - The Any() Query | https://www.tutorialspoint.com/tinydb/tinydb_any_query.htm | 4 |
| 15 | (no heading) | TinyDB - The All() Query | https://www.tutorialspoint.com/tinydb/tinydb_all_query.htm | 3 |
| 16 | (no heading) | TinyDB - The one_of() Query | https://www.tutorialspoint.com/tinydb/tinydb_one_of_query.htm | 3 |
| 17 | (no heading) | TinyDB - Logical Negate | https://www.tutorialspoint.com/tinydb/tinydb_logical_negate.htm | 3 |
| 18 | (no heading) | TinyDB - Logical AND | https://www.tutorialspoint.com/tinydb/tinydb_logical_and.htm | 3 |
| 19 | (no heading) | TinyDB - Logical OR | https://www.tutorialspoint.com/tinydb/tinydb_logical_or.htm | 3 |
| 20 | (no heading) | TinyDB - Handling Data Query | https://www.tutorialspoint.com/tinydb/tinydb_handling_data_query.htm | 3 |
| 21 | (no heading) | TinyDB - Modifying the Data | https://www.tutorialspoint.com/tinydb/tinydb_modifying_the_data.htm | 13 |
| 22 | (no heading) | TinyDB - Upserting Data | https://www.tutorialspoint.com/tinydb/tinydb_upserting_data.htm | 3 |
| 23 | (no heading) | TinyDB - Retrieving Data | https://www.tutorialspoint.com/tinydb/tinydb_retrieving_data.htm | 8 |
| 24 | (no heading) | TinyDB - Document ID | https://www.tutorialspoint.com/tinydb/tinydb_document_id.htm | 8 |
| 25 | (no heading) | TinyDB - Tables | https://www.tutorialspoint.com/tinydb/tinydb_tables.htm | 10 |
| 26 | (no heading) | TinyDB - Default Table | https://www.tutorialspoint.com/tinydb/tinydb_default_table.htm | 3 |
| 27 | (no heading) | TinyDB - Caching Query | https://www.tutorialspoint.com/tinydb/tinydb_caching_query.htm | 2 |
| 28 | (no heading) | TinyDB - Storage Types | https://www.tutorialspoint.com/tinydb/tinydb_storage_types.htm | 4 |
| 29 | (no heading) | TinyDB - Middleware | https://www.tutorialspoint.com/tinydb/tinydb_middleware.htm | 4 |
| 30 | (no heading) | TinyDB - Extend TinyDB | https://www.tutorialspoint.com/tinydb/tinydb_extend_tinydb.htm | 4 |
| 31 | (no heading) | TinyDB - Extensions | https://www.tutorialspoint.com/tinydb/tinydb_extensions.htm | 0 |
| 32 | TinyDB Useful Resources | TinyDB - Quick Guide | https://www.tutorialspoint.com/tinydb/tinydb_quick_guide.htm | 136 |
| 33 | TinyDB Useful Resources | TinyDB - Useful Resources | https://www.tutorialspoint.com/tinydb/tinydb_useful_resources.htm | 0 |
| 34 | TinyDB Useful Resources | TinyDB - Discussion | https://www.tutorialspoint.com/tinydb/tinydb_discussion.htm | 0 |
