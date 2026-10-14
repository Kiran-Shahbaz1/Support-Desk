-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: ticket_management
-- ------------------------------------------------------
-- Server version	8.4.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agent`
--

DROP TABLE IF EXISTS `agent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `teamId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `departmentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Agent_userId_key` (`userId`),
  KEY `Agent_teamId_idx` (`teamId`),
  KEY `Agent_departmentId_idx` (`departmentId`),
  CONSTRAINT `Agent_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Agent_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `team` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Agent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent`
--

LOCK TABLES `agent` WRITE;
/*!40000 ALTER TABLE `agent` DISABLE KEYS */;
INSERT INTO `agent` VALUES ('agent-ahmed','user-ahmed','team-core','dept-core','Support agent',1,'2026-10-02 07:45:59.717','2026-10-02 07:45:59.717'),('agent-kiran','user-kiran','team-leadership','dept-core','Administrator',1,'2026-10-02 07:45:59.674','2026-10-02 07:45:59.674'),('agent-maya','user-maya','team-leadership','dept-core','Manager',1,'2026-10-02 07:45:59.809','2026-10-02 07:45:59.809'),('agent-sara','user-sara','team-enterprise','dept-enterprise','Support agent',1,'2026-10-02 07:45:59.773','2026-10-02 07:45:59.773'),('cmus2v15y000634wo4enpbasy','cmus2v14p000434woxozxlijl',NULL,NULL,'switch issue',1,'2026-10-03 07:35:40.198','2026-10-03 07:36:22.398');
/*!40000 ALTER TABLE `agent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `article`
--

DROP TABLE IF EXISTS `article`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `reads` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Article_category_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `article`
--

LOCK TABLES `article` WRITE;
/*!40000 ALTER TABLE `article` DISABLE KEYS */;
INSERT INTO `article` VALUES ('article-invoices','Understanding invoice export formats','Billing','Choose a supported export format from the billing reports page.',76,'2026-10-02 07:46:00.154','2026-10-02 07:46:00.154'),('article-members','Invite and manage workspace members','Workspace','Invite teammates and assign the correct workspace role.',94,'2026-10-02 07:46:00.114','2026-10-02 07:46:00.114'),('article-sso','Configure SSO for your workspace','Security','Configure SAML metadata and role mapping in workspace security settings.',128,'2026-10-02 07:46:00.063','2026-10-02 07:46:00.063'),('cmuqumx7j000734c4dgfgadl0','Test Article','General','This is a test article body.',0,'2026-10-02 10:57:38.719','2026-10-02 10:57:38.719');
/*!40000 ALTER TABLE `article` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auditlog`
--

DROP TABLE IF EXISTS `auditlog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditlog` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entityId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AuditLog_entity_entityId_createdAt_idx` (`entity`,`entityId`,`createdAt`),
  KEY `AuditLog_actorId_createdAt_idx` (`actorId`,`createdAt`),
  CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditlog`
--

LOCK TABLES `auditlog` WRITE;
/*!40000 ALTER TABLE `auditlog` DISABLE KEYS */;
INSERT INTO `auditlog` VALUES ('cmuqumx3o000334c4ilkdl4h8',NULL,'Created agent Test Agent','Agent','cmuqumx2q000234c4rh9u4s6n',NULL,'2026-10-02 10:57:38.581'),('cmuqumxbu000934c4ta6g57rf',NULL,'Test action','Test',NULL,NULL,'2026-10-02 10:57:38.875'),('cmus2v16u000734wo3jmu8eas',NULL,'Created agent Waqas','Agent','cmus2v15y000634wo4enpbasy',NULL,'2026-10-03 07:35:40.231');
/*!40000 ALTER TABLE `auditlog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `automationrule`
--

DROP TABLE IF EXISTS `automationrule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `automationrule` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `triggerType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conditions` json NOT NULL,
  `actionType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` json NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `AutomationRule_active_triggerType_idx` (`active`,`triggerType`),
  KEY `AutomationRule_createdById_fkey` (`createdById`),
  CONSTRAINT `AutomationRule_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `automationrule`
--

LOCK TABLES `automationrule` WRITE;
/*!40000 ALTER TABLE `automationrule` DISABLE KEYS */;
INSERT INTO `automationrule` VALUES ('cmuqumx8j000834c496aqs861','Test Rule','Priority is Critical','priority-critical','{}','assign-manager','{\"label\": \"Assign to Manager\"}',1,NULL,'2026-10-02 10:57:38.756','2026-10-02 10:57:38.756'),('rule-close','Close resolved tickets',NULL,'resolved-seven-days','{}','archive-ticket','{\"label\": \"Archive ticket\"}',0,NULL,'2026-10-02 07:46:00.314','2026-10-02 07:46:00.314'),('rule-escalate','Escalate critical tickets',NULL,'priority-critical','{}','assign-manager','{\"label\": \"Assign to Support Manager + notify\"}',1,NULL,'2026-10-02 07:46:00.239','2026-10-02 07:46:00.239'),('rule-sla','SLA risk alert',NULL,'sla-under-hour','{}','notify-assignee','{\"label\": \"Notify assignee + manager\"}',1,NULL,'2026-10-02 07:46:00.279','2026-10-02 07:46:00.279');
/*!40000 ALTER TABLE `automationrule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `automationrun`
--

DROP TABLE IF EXISTS `automationrun`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `automationrun` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruleId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticketId` int DEFAULT NULL,
  `status` enum('SUCCEEDED','FAILED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUCCEEDED',
  `error` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AutomationRun_ruleId_createdAt_idx` (`ruleId`,`createdAt`),
  KEY `AutomationRun_ticketId_createdAt_idx` (`ticketId`,`createdAt`),
  CONSTRAINT `AutomationRun_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `automationrule` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AutomationRun_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `ticket` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `automationrun`
--

LOCK TABLES `automationrun` WRITE;
/*!40000 ALTER TABLE `automationrun` DISABLE KEYS */;
/*!40000 ALTER TABLE `automationrun` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Customer_email_key` (`email`),
  KEY `Customer_name_idx` (`name`),
  KEY `Customer_company_idx` (`company`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer`
--

LOCK TABLES `customer` WRITE;
/*!40000 ALTER TABLE `customer` DISABLE KEYS */;
INSERT INTO `customer` VALUES ('cmuqnz5lf000034uwwjuqihoh','Mina Khan','mina@example.com',NULL,NULL,'2026-10-02 07:51:12.147','2026-10-02 07:51:12.147'),('cmuqrp2nk000034640ca555mk','Hunainahmad','customer@example.com',NULL,NULL,'2026-10-02 09:35:20.240','2026-10-02 09:35:20.240'),('cmuqs1nsm000034t4m2p4ydoa','Waqas','custom@gmail.com',NULL,NULL,'2026-10-02 09:45:07.510','2026-10-02 09:45:07.510'),('cmuqum92y00003424ab9aitsl','Test User',NULL,NULL,NULL,'2026-10-02 10:57:07.449','2026-10-02 10:57:07.449'),('cmuquonli000034kwiflfqbbj','Fix Test Customer','fix@test.com',NULL,NULL,'2026-10-02 10:58:59.574','2026-10-02 10:58:59.574'),('cmuqv03mp000034gca1p9eer1','kiran','test@gmail.com',NULL,NULL,'2026-10-02 11:07:53.570','2026-10-02 11:07:53.570'),('cmus1nxow000034wohujkbvyj','Shahbaz','appcustomer@gmail.com',NULL,NULL,'2026-10-03 07:02:09.489','2026-10-03 07:02:09.489'),('cust-jon','Jon Bell','jon.bell@globex.com','Globex',NULL,'2026-10-02 07:45:59.974','2026-10-02 07:45:59.974'),('cust-maya','Maya Chen','maya.chen@acme.co','Acme Corp',NULL,'2026-10-02 07:45:59.843','2026-10-02 07:45:59.843'),('cust-owen','Owen Wilson','owen.wilson@example.com','Example Inc',NULL,'2026-10-02 07:46:00.016','2026-10-02 07:46:00.016'),('cust-priya','Priya Nair','priya.nair@contoso.com','Contoso',NULL,'2026-10-02 07:45:59.930','2026-10-02 07:45:59.930'),('cust-theo','Theo Martin','theo.martin@northwind.io','Northwind',NULL,'2026-10-02 07:45:59.888','2026-10-02 07:45:59.888');
/*!40000 ALTER TABLE `customer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Department_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `department`
--

LOCK TABLES `department` WRITE;
/*!40000 ALTER TABLE `department` DISABLE KEYS */;
INSERT INTO `department` VALUES ('cmuqumx6j000634c4v91hv9xd','Test Dept','A test dept','2026-10-02 10:57:38.684','2026-10-02 10:57:38.684'),('dept-core','Core support','General support questions and triage','2026-10-02 07:45:59.308','2026-10-02 07:45:59.308'),('dept-data','Data support','Analytics, data sync, and reports','2026-10-02 07:45:59.457','2026-10-02 07:45:59.457'),('dept-enterprise','Enterprise','SSO, compliance, and dedicated accounts','2026-10-02 07:45:59.407','2026-10-02 07:45:59.407'),('dept-finance','Finance support','Billing, invoices, and accounting support','2026-10-02 07:45:59.359','2026-10-02 07:45:59.359');
/*!40000 ALTER TABLE `department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `internalnote`
--

DROP TABLE IF EXISTS `internalnote`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `internalnote` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticketId` int NOT NULL,
  `authorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `InternalNote_ticketId_createdAt_idx` (`ticketId`,`createdAt`),
  KEY `InternalNote_authorId_fkey` (`authorId`),
  CONSTRAINT `InternalNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `InternalNote_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `internalnote`
--

LOCK TABLES `internalnote` WRITE;
/*!40000 ALTER TABLE `internalnote` DISABLE KEYS */;
/*!40000 ALTER TABLE `internalnote` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticketId` int DEFAULT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('UNREAD','READ') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNREAD',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `readAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Notification_userId_status_createdAt_idx` (`userId`,`status`,`createdAt`),
  KEY `Notification_ticketId_fkey` (`ticketId`),
  CONSTRAINT `Notification_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification`
--

LOCK TABLES `notification` WRITE;
/*!40000 ALTER TABLE `notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permission`
--

DROP TABLE IF EXISTS `permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permission` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Permission_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permission`
--

LOCK TABLES `permission` WRITE;
/*!40000 ALTER TABLE `permission` DISABLE KEYS */;
/*!40000 ALTER TABLE `permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Role_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role`
--

LOCK TABLES `role` WRITE;
/*!40000 ALTER TABLE `role` DISABLE KEYS */;
INSERT INTO `role` VALUES ('role-admin','Administrator','Full workspace access and management','2026-10-02 07:45:58.873'),('role-agent','Agent','Handle and resolve customer tickets','2026-10-02 07:45:58.907'),('role-customer','Customer','Submit tickets and view own updates','2026-10-02 07:45:58.978'),('role-manager','Manager','Oversee queues, SLA, and workloads','2026-10-02 07:45:58.948');
/*!40000 ALTER TABLE `role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rolepermission`
--

DROP TABLE IF EXISTS `rolepermission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rolepermission` (
  `roleId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permissionId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`roleId`,`permissionId`),
  KEY `RolePermission_permissionId_idx` (`permissionId`),
  CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rolepermission`
--

LOCK TABLES `rolepermission` WRITE;
/*!40000 ALTER TABLE `rolepermission` DISABLE KEYS */;
/*!40000 ALTER TABLE `rolepermission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `setting`
--

DROP TABLE IF EXISTS `setting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `setting` (
  `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `setting`
--

LOCK TABLES `setting` WRITE;
/*!40000 ALTER TABLE `setting` DISABLE KEYS */;
INSERT INTO `setting` VALUES ('workspace_settings','{\"email\":true,\"realtime\":true,\"sla\":true}','2026-10-03 10:34:45.879');
/*!40000 ALTER TABLE `setting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `slaevent`
--

DROP TABLE IF EXISTS `slaevent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `slaevent` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticketId` int NOT NULL,
  `policyId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('FIRST_RESPONSE','RESOLUTION') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','MET','BREACHED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `targetAt` datetime(3) NOT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `SlaEvent_status_targetAt_idx` (`status`,`targetAt`),
  KEY `SlaEvent_ticketId_type_idx` (`ticketId`,`type`),
  KEY `SlaEvent_policyId_fkey` (`policyId`),
  CONSTRAINT `SlaEvent_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `slapolicy` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `SlaEvent_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slaevent`
--

LOCK TABLES `slaevent` WRITE;
/*!40000 ALTER TABLE `slaevent` DISABLE KEYS */;
/*!40000 ALTER TABLE `slaevent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `slapolicy`
--

DROP TABLE IF EXISTS `slapolicy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `slapolicy` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('CRITICAL','HIGH','MEDIUM','LOW') COLLATE utf8mb4_unicode_ci NOT NULL,
  `firstResponseMins` int NOT NULL,
  `resolutionMins` int NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `SlaPolicy_name_priority_key` (`name`,`priority`),
  KEY `SlaPolicy_active_priority_idx` (`active`,`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slapolicy`
--

LOCK TABLES `slapolicy` WRITE;
/*!40000 ALTER TABLE `slapolicy` DISABLE KEYS */;
/*!40000 ALTER TABLE `slapolicy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tag`
--

DROP TABLE IF EXISTS `tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tag` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Tag_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tag`
--

LOCK TABLES `tag` WRITE;
/*!40000 ALTER TABLE `tag` DISABLE KEYS */;
INSERT INTO `tag` VALUES ('cmuqnsh810007347sjsb2edgn','Analytics'),('cmuqv03no000334gcxao8n0nz','billing'),('cmuqnsh740006347scvhm5jsc','Data'),('cmuqnsh610005347sqynzcvr8','Enterprise'),('cmuqnsh9v0009347si22rydv4','How-to'),('cmuqnsh8y0008347s89y0dp37','Incident'),('cmuqnsh2y0002347swdn49f1x','Invite'),('cmuqnsh1t0001347s65p2n834','Invoice'),('cmuqnz5mb000334uwryl940bw','login'),('cmuqnsh0o0000347s8l1ms66x','SLA risk'),('cmuqnsh500004347s17xooo8f','SSO'),('cmuqnz5mb000434uwva5o4om1','urgent'),('cmuqnsh3u0003347sln13lmy2','Workspace');
/*!40000 ALTER TABLE `tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team`
--

DROP TABLE IF EXISTS `team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `departmentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Team_name_key` (`name`),
  KEY `Team_departmentId_idx` (`departmentId`),
  CONSTRAINT `Team_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team`
--

LOCK TABLES `team` WRITE;
/*!40000 ALTER TABLE `team` DISABLE KEYS */;
INSERT INTO `team` VALUES ('cmuqumx57000534c4cng8nlg0','Test Team','A test team',NULL,'2026-10-02 10:57:38.636','2026-10-02 10:57:38.636'),('team-core','Core support','Tier 1 support queue','dept-core','2026-10-02 07:45:59.498','2026-10-02 07:45:59.498'),('team-data','Data support','Analytics triage desk','dept-data','2026-10-02 07:45:59.578','2026-10-02 07:45:59.578'),('team-enterprise','Enterprise','Enterprise customer desk','dept-enterprise','2026-10-02 07:45:59.543','2026-10-02 07:45:59.543'),('team-leadership','Leadership','Support leadership and escalations','dept-core','2026-10-02 07:45:59.623','2026-10-02 07:45:59.623');
/*!40000 ALTER TABLE `team` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket`
--

DROP TABLE IF EXISTS `ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket` (
  `id` int NOT NULL AUTO_INCREMENT,
  `publicId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'General',
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'General inquiry',
  `status` enum('OPEN','PENDING','RESOLVED','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `priority` enum('CRITICAL','HIGH','MEDIUM','LOW') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM',
  `channel` enum('WEB','EMAIL','CHAT','PHONE','API') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WEB',
  `sla` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dueAt` datetime(3) DEFAULT NULL,
  `resolvedAt` datetime(3) DEFAULT NULL,
  `archivedAt` datetime(3) DEFAULT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigneeAgentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigneeLabel` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unassigned',
  `teamId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `teamLabel` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Core support',
  `departmentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `departmentLabel` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Core support',
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Ticket_publicId_key` (`publicId`),
  KEY `Ticket_status_priority_idx` (`status`,`priority`),
  KEY `Ticket_assigneeAgentId_status_idx` (`assigneeAgentId`,`status`),
  KEY `Ticket_customerId_createdAt_idx` (`customerId`,`createdAt`),
  KEY `Ticket_teamId_departmentId_idx` (`teamId`,`departmentId`),
  KEY `Ticket_archivedAt_idx` (`archivedAt`),
  KEY `Ticket_departmentId_fkey` (`departmentId`),
  KEY `Ticket_createdById_fkey` (`createdById`),
  CONSTRAINT `Ticket_assigneeAgentId_fkey` FOREIGN KEY (`assigneeAgentId`) REFERENCES `agent` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Ticket_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Ticket_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Ticket_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Ticket_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `team` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1053 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket`
--

LOCK TABLES `ticket` WRITE;
/*!40000 ALTER TABLE `ticket` DISABLE KEYS */;
INSERT INTO `ticket` VALUES (1038,'cmuqnshxy000z347s95s6x2ko','How do I change my notification digest?','Customer asked where notification digest preferences can be changed.','Account','Notifications','RESOLVED','LOW','WEB','Closed',NULL,'2026-10-02 07:46:00.737',NULL,'cust-owen','agent-ahmed','Ahmed Khan','team-core','Core support','dept-core','Core support',NULL,'2026-10-02 07:46:01.558','2026-10-02 07:46:01.558'),(1039,'cmuqnshsn000t347s4qniaz35','Dashboard data is delayed by one hour','Analytics dashboard is showing data from the previous hour.','Analytics','Data latency','OPEN','HIGH','API','03:11 left',NULL,NULL,NULL,'cust-jon','agent-kiran','Kiran Shah','team-data','Data support','dept-data','Data support',NULL,'2026-10-02 07:46:01.367','2026-10-02 07:46:01.367'),(1040,'cmuqnsho6000p347swwfmsf1i','SSO setup questions for the finance team','Customer needs guidance for configuring SAML metadata and role mapping.','Security','SSO / Identity','OPEN','MEDIUM','EMAIL','05:40 left',NULL,NULL,NULL,'cust-priya','agent-sara','Sara Davis','team-enterprise','Enterprise','dept-enterprise','Enterprise',NULL,'2026-10-02 07:46:01.206','2026-10-02 07:46:01.206'),(1041,'cmuqnshha000h347sohwvtd94','Cannot invite a new workspace member','The invite button spins indefinitely for a new workspace member.','Workspace','Member access','PENDING','HIGH','CHAT','02:18 left',NULL,NULL,NULL,'cust-theo','agent-ahmed','Ahmed Khan','team-core','Core support','dept-core','Core support',NULL,'2026-10-02 07:46:00.958','2026-10-02 07:46:00.958'),(1042,'cmuqnshba000b347sboo70dcs','Invoice export returns a blank PDF','The finance team receives a blank PDF when exporting the monthly invoice report.','Billing','Billing report','OPEN','CRITICAL','EMAIL','00:42 left',NULL,NULL,NULL,'cust-maya','agent-kiran','Kiran Shah','team-core','Core support','dept-finance','Finance support',NULL,'2026-10-02 07:46:00.742','2026-10-02 07:46:00.742'),(1046,'cmuqs1ntk000234t4f7tuaehi','charger issue','charger issue','General','General inquiry','OPEN','MEDIUM','WEB','Standard',NULL,NULL,NULL,'cmuqs1nsm000034t4m2p4ydoa',NULL,'Kiran Shah',NULL,'Core support',NULL,'Core support',NULL,'2026-10-02 09:45:07.544','2026-10-03 08:25:48.529');
/*!40000 ALTER TABLE `ticket` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticketactivity`
--

DROP TABLE IF EXISTS `ticketactivity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticketactivity` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticketId` int DEFAULT NULL,
  `actorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `TicketActivity_ticketId_createdAt_idx` (`ticketId`,`createdAt`),
  KEY `TicketActivity_actorId_createdAt_idx` (`actorId`,`createdAt`),
  CONSTRAINT `TicketActivity_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `TicketActivity_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `ticket` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticketactivity`
--

LOCK TABLES `ticketactivity` WRITE;
/*!40000 ALTER TABLE `ticketactivity` DISABLE KEYS */;
INSERT INTO `ticketactivity` VALUES ('cmuqnshfc000d347s4mkwcvif',1042,NULL,'Ticket created via email',NULL,'2026-10-02 07:46:00.888'),('cmuqnshge000f347s1qtb87uy',1042,NULL,'Priority raised to Critical',NULL,'2026-10-02 07:46:00.926'),('cmuqnshm6000l347szcsxbtwj',1041,NULL,'Ticket created via chat',NULL,'2026-10-02 07:46:01.134'),('cmuqnshn7000n347sguvd0qy6',1041,NULL,'Assigned to Ahmed Khan',NULL,'2026-10-02 07:46:01.172'),('cmuqnshru000r347sfphb2rvo',1040,NULL,'Ticket created via email',NULL,'2026-10-02 07:46:01.338'),('cmuqnshvj000v347sne08867m',1039,NULL,'Ticket created via API',NULL,'2026-10-02 07:46:01.471'),('cmuqnshwi000x347syv7205c2',1039,NULL,'Tagged as Incident',NULL,'2026-10-02 07:46:01.506'),('cmuqnsi1s0013347svmutp5vx',1038,NULL,'Ticket created via web form',NULL,'2026-10-02 07:46:01.697'),('cmuqnsi2y0015347s3jiyq3rt',1038,NULL,'Resolved by Ahmed Khan',NULL,'2026-10-02 07:46:01.738'),('cmuqnz5mb000534uwxsvdoi45',NULL,NULL,'Ticket created',NULL,'2026-10-02 07:51:12.179'),('cmuqnz5mb000634uwijfsyv44',NULL,NULL,'Assigned to Sara Davis',NULL,'2026-10-02 07:51:12.179'),('cmuqnz5qc000734uwvhuqhne3',NULL,NULL,'Priority changed to Medium',NULL,'2026-10-02 07:51:12.324'),('cmuqnz5qc000834uw55mkwbu7',NULL,NULL,'Status changed to Resolved',NULL,'2026-10-02 07:51:12.324'),('cmuqnz5t8000c34uwjc7noboc',NULL,NULL,'Internal note added',NULL,'2026-10-02 07:51:12.429'),('cmuqnzkqt000434s8ct4krs8d',NULL,NULL,'Ticket created',NULL,'2026-10-02 07:51:31.781'),('cmuqnzkqt000534s8ce9ktxwr',NULL,NULL,'Assigned to Sara Davis',NULL,'2026-10-02 07:51:31.781'),('cmuqnzkvt000634s8i3z6pfy2',NULL,NULL,'Priority changed to Medium',NULL,'2026-10-02 07:51:31.962'),('cmuqnzkvt000734s87f8d4vd6',NULL,NULL,'Status changed to Resolved',NULL,'2026-10-02 07:51:31.962'),('cmuqnzkzy000b34s863145wmw',NULL,NULL,'Internal note added',NULL,'2026-10-02 07:51:32.110'),('cmuqrp2oo00033464cze4sk08',NULL,NULL,'Ticket created',NULL,'2026-10-02 09:35:20.279'),('cmuqs1ntk000334t4b6rry2u3',1046,NULL,'Ticket created',NULL,'2026-10-02 09:45:07.544'),('cmuqum94q00033424pvo29w1u',NULL,NULL,'Ticket created',NULL,'2026-10-02 10:57:07.512'),('cmuqum974000434249jlb2frg',NULL,NULL,'Status changed to Resolved',NULL,'2026-10-02 10:57:07.600'),('cmuqv03np000434gclvxf5h84',NULL,NULL,'Ticket created',NULL,'2026-10-02 11:07:53.605'),('cmuqv03np000534gch6vlynra',NULL,NULL,'Assigned to Kiran Shah',NULL,'2026-10-02 11:07:53.605'),('cmus1nxpu000334wow9su2t08',NULL,NULL,'Ticket created',NULL,'2026-10-03 07:02:09.522'),('cmus3z0l6000834woel52dwua',NULL,NULL,'Priority changed to Medium',NULL,'2026-10-03 08:06:45.691'),('cmus3z0l6000934wobihtqasu',NULL,NULL,'Assigned to Kar Do',NULL,'2026-10-03 08:06:45.691'),('cmus3zzs4000a34wo7cw1lxmf',NULL,NULL,'Assigned to Ki Ownership Waqas',NULL,'2026-10-03 08:07:31.301'),('cmus4niep000b34wobk3m60ds',1046,NULL,'Priority changed to Medium',NULL,'2026-10-03 08:25:48.529'),('cmus4niep000c34wo6k0z154s',1046,NULL,'Assigned to Kiran Shah',NULL,'2026-10-03 08:25:48.529'),('cmus4o2ts000d34wohl9ywhh0',NULL,NULL,'Assigned to Ahmad',NULL,'2026-10-03 08:26:14.992'),('cmuth7c0l0004342kdvwxvy6u',NULL,NULL,'Ticket created',NULL,'2026-10-04 07:04:54.927'),('cmuth7c0l0005342k7qapcyuj',NULL,NULL,'Assigned to Sara Davis',NULL,'2026-10-04 07:04:54.927'),('cmuth7c4f0006342k0viy2psw',NULL,NULL,'Priority changed to Medium',NULL,'2026-10-04 07:04:55.072'),('cmuth7c4f0007342k798zef24',NULL,NULL,'Status changed to Resolved',NULL,'2026-10-04 07:04:55.072'),('cmuth7c73000b342kimltp87e',NULL,NULL,'Internal note added',NULL,'2026-10-04 07:04:55.167'),('cmuth9uyr0004342s0ndrfyiw',NULL,NULL,'Ticket created',NULL,'2026-10-04 07:06:52.803'),('cmuth9uyr0005342sj5acx83k',NULL,NULL,'Assigned to Sara Davis',NULL,'2026-10-04 07:06:52.803'),('cmuth9v160006342slaj8ln9t',NULL,NULL,'Priority changed to Medium',NULL,'2026-10-04 07:06:52.890'),('cmuth9v160007342s8blco5m3',NULL,NULL,'Status changed to Resolved',NULL,'2026-10-04 07:06:52.890'),('cmuth9v3q000b342sg56dyfca',NULL,NULL,'Internal note added',NULL,'2026-10-04 07:06:52.982'),('cmuthdage00043460cx34u8qy',NULL,NULL,'Ticket created',NULL,'2026-10-04 07:09:32.845'),('cmuthdage0005346001tcz518',NULL,NULL,'Assigned to Sara Davis',NULL,'2026-10-04 07:09:32.845'),('cmuthdaix000634607rfikp2o',NULL,NULL,'Priority changed to Medium',NULL,'2026-10-04 07:09:32.937'),('cmuthdaix00073460fsnpe1ck',NULL,NULL,'Status changed to Resolved',NULL,'2026-10-04 07:09:32.937'),('cmuthdald000b3460s8cttxqv',NULL,NULL,'Internal note added',NULL,'2026-10-04 07:09:33.025');
/*!40000 ALTER TABLE `ticketactivity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticketattachment`
--

DROP TABLE IF EXISTS `ticketattachment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticketattachment` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticketId` int NOT NULL,
  `uploadedById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fileName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storageKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contentType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sizeBytes` int NOT NULL,
  `uploadedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `TicketAttachment_ticketId_idx` (`ticketId`),
  KEY `TicketAttachment_uploadedById_fkey` (`uploadedById`),
  CONSTRAINT `TicketAttachment_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TicketAttachment_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticketattachment`
--

LOCK TABLES `ticketattachment` WRITE;
/*!40000 ALTER TABLE `ticketattachment` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticketattachment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticketcomment`
--

DROP TABLE IF EXISTS `ticketcomment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticketcomment` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticketId` int NOT NULL,
  `authorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `visibility` enum('PUBLIC','INTERNAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PUBLIC',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `TicketComment_ticketId_createdAt_idx` (`ticketId`,`createdAt`),
  KEY `TicketComment_authorId_fkey` (`authorId`),
  CONSTRAINT `TicketComment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `TicketComment_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticketcomment`
--

LOCK TABLES `ticketcomment` WRITE;
/*!40000 ALTER TABLE `ticketcomment` DISABLE KEYS */;
INSERT INTO `ticketcomment` VALUES ('cmuqnshko000j347seiogaalc',1041,NULL,'Requested a screen recording from the customer.','PUBLIC','2026-10-02 07:46:01.081'),('cmuqnsi0m0011347swdxdk3yn',1038,NULL,'Shared the notification preferences article.','PUBLIC','2026-10-02 07:46:01.654');
/*!40000 ALTER TABLE `ticketcomment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickettag`
--

DROP TABLE IF EXISTS `tickettag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickettag` (
  `ticketId` int NOT NULL,
  `tagId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`ticketId`,`tagId`),
  KEY `TicketTag_tagId_idx` (`tagId`),
  CONSTRAINT `TicketTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tag` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TicketTag_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickettag`
--

LOCK TABLES `tickettag` WRITE;
/*!40000 ALTER TABLE `tickettag` DISABLE KEYS */;
INSERT INTO `tickettag` VALUES (1042,'cmuqnsh0o0000347s8l1ms66x'),(1042,'cmuqnsh1t0001347s65p2n834'),(1041,'cmuqnsh2y0002347swdn49f1x'),(1041,'cmuqnsh3u0003347sln13lmy2'),(1040,'cmuqnsh500004347s17xooo8f'),(1040,'cmuqnsh610005347sqynzcvr8'),(1039,'cmuqnsh810007347sjsb2edgn'),(1039,'cmuqnsh8y0008347s89y0dp37'),(1038,'cmuqnsh9v0009347si22rydv4');
/*!40000 ALTER TABLE `tickettag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('cmuqumx1n000034c4et8n6aeu','Test Agent','testagent@test.com','demo-hash','ACTIVE','2026-10-02 10:57:38.508','2026-10-02 10:57:38.508'),('cmus2v14p000434woxozxlijl','Waqas','waqas@supportdesk.io','demo-hash','ACTIVE','2026-10-03 07:35:40.153','2026-10-03 07:36:22.363'),('user-admin','Workspace administrator','admin@supportdesk.io','demo-hash','ACTIVE','2026-10-02 07:45:59.010','2026-10-02 07:45:59.010'),('user-ahmed','Ahmed Khan','ahmed.khan@supportdesk.io','demo-hash','ACTIVE','2026-10-02 07:45:59.159','2026-10-02 07:45:59.159'),('user-kiran','Kiran Shah','kiran.shah@supportdesk.io','demo-hash','ACTIVE','2026-10-02 07:45:59.047','2026-10-02 07:45:59.047'),('user-maya','Maya Patel','maya.patel@supportdesk.io','demo-hash','ACTIVE','2026-10-02 07:45:59.258','2026-10-02 07:45:59.258'),('user-sara','Sara Davis','sara.davis@supportdesk.io','demo-hash','ACTIVE','2026-10-02 07:45:59.209','2026-10-02 07:45:59.209');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `userrole`
--

DROP TABLE IF EXISTS `userrole`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `userrole` (
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roleId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`userId`,`roleId`),
  KEY `UserRole_roleId_idx` (`roleId`),
  CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `userrole`
--

LOCK TABLES `userrole` WRITE;
/*!40000 ALTER TABLE `userrole` DISABLE KEYS */;
/*!40000 ALTER TABLE `userrole` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'ticket_management'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-14 10:31:39
