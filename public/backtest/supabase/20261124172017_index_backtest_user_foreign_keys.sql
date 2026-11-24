-- Applied to Supabase project gypmqvajtzxqfzmepudu as migration
-- 20261124172017_index_backtest_user_foreign_keys.
-- Supporting indexes for the user_id foreign keys on the backtest tables.
create index if not exists bt_dataset_chunks_user_id_idx on public.bt_dataset_chunks(user_id);
create index if not exists bt_datasets_user_id_idx on public.bt_datasets(user_id);
create index if not exists bt_drawings_user_id_idx on public.bt_drawings(user_id);
create index if not exists bt_imports_user_id_idx on public.bt_imports(user_id);
create index if not exists bt_indicator_templates_user_id_idx on public.bt_indicator_templates(user_id);
create index if not exists bt_journal_user_id_idx on public.bt_journal(user_id);
create index if not exists bt_layouts_user_id_idx on public.bt_layouts(user_id);
create index if not exists bt_prop_configs_user_id_idx on public.bt_prop_configs(user_id);
create index if not exists bt_screenshots_user_id_idx on public.bt_screenshots(user_id);
create index if not exists bt_sessions_user_id_idx on public.bt_sessions(user_id);
create index if not exists bt_settings_user_id_idx on public.bt_settings(user_id);
create index if not exists bt_strategies_user_id_idx on public.bt_strategies(user_id);
create index if not exists bt_trades_user_id_idx on public.bt_trades(user_id);
create index if not exists bt_zones_user_id_idx on public.bt_zones(user_id);
