# Hosted data library

Put your historical CSV files in this folder and list them in `manifest.json`. They then appear in
**Trading Terminal → New Backtest → Data Library** with a one-click "Load" button (no upload needed).

```json
{
  "datasets": [
    {
      "name": "EURUSD 5m 2023-2024",
      "symbol": "EURUSD",
      "market": "forex",
      "tf": "5m",
      "file": "EURUSD_M5.csv",
      "source": "Your data source",
      "tz_offset_minutes": 0
    }
  ]
}
```

- `market`: forex, crypto, metals, indices or stocks. `tf`: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w.
- `tz_offset_minutes`: the timezone of the timestamps inside the file (0 = UTC, 120 = UTC+2). The app stores UTC.
- CSV needs time/open/high/low/close (volume optional). Delimiter, header and date format are auto-detected.
- Always check the licence of any free data source before using or redistributing it.
