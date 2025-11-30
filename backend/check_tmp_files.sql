SELECT COUNT(*) as count, 
       SUBSTRING_INDEX(storagePath, '/', 1) as path_prefix
FROM File 
WHERE storagePath LIKE '%tmp%' 
GROUP BY path_prefix;
