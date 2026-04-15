-- 插入区域数据
INSERT INTO campus_zones (name, description, is_active) VALUES
('主校区', '中国传媒大学主校区区域', true),
('梆子井公寓区', '梆子井学生公寓区域', true),
('中蓝公寓区', '中蓝学生公寓区域', true);

-- 获取区域ID变量
WITH zones AS (
  SELECT id, name FROM campus_zones
)
-- 插入地点数据
INSERT INTO campus_locations (name, address, latitude, longitude, zone_id, is_active)
SELECT 
  '主楼', '中国传媒大学主楼', 39.9155, 116.5568, z.id, true
FROM zones z WHERE z.name = '主校区'
UNION ALL
SELECT 
  '图书馆', '中国传媒大学图书馆', 39.9150, 116.5580, z.id, true
FROM zones z WHERE z.name = '主校区'
UNION ALL
SELECT 
  '一教', '中国传媒大学第一教学楼', 39.9160, 116.5555, z.id, true
FROM zones z WHERE z.name = '主校区'
UNION ALL
SELECT 
  '二教', '中国传媒大学第二教学楼', 39.9145, 116.5560, z.id, true
FROM zones z WHERE z.name = '主校区'
UNION ALL
SELECT 
  '三教', '中国传媒大学第三教学楼', 39.9135, 116.5570, z.id, true
FROM zones z WHERE z.name = '主校区'
UNION ALL
SELECT 
  '星光超市', '中国传媒大学星光超市', 39.9140, 116.5590, z.id, true
FROM zones z WHERE z.name = '主校区'
UNION ALL
SELECT 
  '南门', '中国传媒大学南门', 39.9130, 116.5595, z.id, true
FROM zones z WHERE z.name = '主校区'
UNION ALL
SELECT 
  '北门', '中国传媒大学北门', 39.9180, 116.5560, z.id, true
FROM zones z WHERE z.name = '主校区'
UNION ALL
SELECT 
  '传媒博物馆', '中国传媒大学传媒博物馆', 39.9148, 116.5575, z.id, true
FROM zones z WHERE z.name = '主校区'
UNION ALL
SELECT 
  '体育场', '中国传媒大学体育场', 39.9165, 116.5575, z.id, true
FROM zones z WHERE z.name = '主校区'
UNION ALL
SELECT 
  '梆子井公寓1号楼', '梆子井学生公寓1号楼', 39.9120, 116.5620, z.id, true
FROM zones z WHERE z.name = '梆子井公寓区'
UNION ALL
SELECT 
  '梆子井公寓2号楼', '梆子井学生公寓2号楼', 39.9125, 116.5625, z.id, true
FROM zones z WHERE z.name = '梆子井公寓区'
UNION ALL
SELECT 
  '梆子井公寓3号楼', '梆子井学生公寓3号楼', 39.9130, 116.5630, z.id, true
FROM zones z WHERE z.name = '梆子井公寓区'
UNION ALL
SELECT 
  '梆子井食堂', '梆子井学生食堂', 39.9122, 116.5622, z.id, true
FROM zones z WHERE z.name = '梆子井公寓区'
UNION ALL
SELECT 
  '梆子井快递站', '梆子井快递驿站', 39.9128, 116.5628, z.id, true
FROM zones z WHERE z.name = '梆子井公寓区'
UNION ALL
SELECT 
  '中蓝公寓', '中蓝学生公寓', 39.9170, 116.5540, z.id, true
FROM zones z WHERE z.name = '中蓝公寓区';
