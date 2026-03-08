-- Copy catalog data from dedicated DB to shared BI DB with table prefix.
-- Adjust database names before execution.
--
-- Source DB (old):      contcatlog
-- Target DB (shared):   data_layer_bitrix
-- Prefix in target:     catalog_

CREATE TABLE IF NOT EXISTS `data_layer_bitrix`.`catalog_users` LIKE `contcatlog`.`users`;
INSERT INTO `data_layer_bitrix`.`catalog_users` SELECT * FROM `contcatlog`.`users`;

CREATE TABLE IF NOT EXISTS `data_layer_bitrix`.`catalog_admin_users` LIKE `contcatlog`.`admin_users`;
INSERT INTO `data_layer_bitrix`.`catalog_admin_users` SELECT * FROM `contcatlog`.`admin_users`;

CREATE TABLE IF NOT EXISTS `data_layer_bitrix`.`catalog_containers` LIKE `contcatlog`.`containers`;
INSERT INTO `data_layer_bitrix`.`catalog_containers` SELECT * FROM `contcatlog`.`containers`;

CREATE TABLE IF NOT EXISTS `data_layer_bitrix`.`catalog_container_photos` LIKE `contcatlog`.`container_photos`;
INSERT INTO `data_layer_bitrix`.`catalog_container_photos` SELECT * FROM `contcatlog`.`container_photos`;

CREATE TABLE IF NOT EXISTS `data_layer_bitrix`.`catalog_import_history` LIKE `contcatlog`.`import_history`;
INSERT INTO `data_layer_bitrix`.`catalog_import_history` SELECT * FROM `contcatlog`.`import_history`;
