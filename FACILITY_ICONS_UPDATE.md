# Facility Icons Update

## 變更內容

1. **資料庫變更**：
   - 在 `facilities` 表新增 `icon` 欄位 (text 類型)
   - 更新種子資料使用 Lucide 圖標名稱

2. **前端變更**：
   - MapView 現在使用 Lucide 圖標 SVG 而非文字標記
   - API 現在會取得 `icon` 欄位
   - 移除了 `mapFacilityIcon` 轉換函數，直接使用資料庫的值

## 如何應用變更

### 方法一：重新執行完整 schema（開發環境）

```bash
cd web
# 如果使用本地 Supabase
supabase db reset

# 或直接執行 schema.sql
psql -U postgres -d your_database -f supabase/schema.sql
```

### 方法二：僅執行遷移腳本（生產環境）

```bash
cd web
# 執行遷移
psql -U postgres -d your_database -f supabase/migrations/add_facility_icons.sql

# 或使用 Supabase CLI
supabase db push
```

## 圖標對應表

| 設施類型 | Lucide 圖標名稱 |
|---------|----------------|
| park | TreeDeciduous |
| playground | TreeDeciduous |
| street_light | Lightbulb |
| police_station | ShieldCheck |
| sidewalk | Footprints |
| elder_center | HeartHandshake |
| drinking_fountain | Droplets |
| school_zone | School |
| road_hazard | Construction |
| 其他 | MapPin (預設) |

## 新增設施時

在資料庫新增設施時，請在 `icon` 欄位填入 Lucide 圖標名稱。

可用的 Lucide 圖標：https://lucide.dev/icons/

範例：
```sql
INSERT INTO facilities (name, type, icon, geom, ...)
VALUES ('新公園', 'park', 'TreeDeciduous', ST_SetSRID(ST_MakePoint(120.5, 24.0), 4326), ...);
```
