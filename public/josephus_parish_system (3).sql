-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 22, 2026 at 05:09 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `josephus_parish_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `asset_maintenance`
--

CREATE TABLE `asset_maintenance` (
  `maint_id` int(11) NOT NULL,
  `asset_id` int(11) DEFAULT NULL,
  `maintenance_date` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `next_schedule` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `table_affected` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `log_timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`log_id`, `user_id`, `action_type`, `table_affected`, `description`, `log_timestamp`) VALUES
(1, 1, 'CREATE', 'persons', 'Created new persons: ', '2026-02-21 12:06:06'),
(2, 1, 'CREATE', 'persons', 'Created new persons: johnreyw a andese', '2026-02-21 12:06:34'),
(3, 1, 'DELETE', 'persons', 'Deleted persons (ID: 23): johnreyw a andese', '2026-02-21 12:09:54'),
(4, 1, 'DELETE', 'persons', 'Deleted persons (ID: 21): ', '2026-02-21 12:09:58'),
(5, 1, 'CREATE', 'persons', 'Created new persons: johnrey bantigue andes', '2026-02-22 00:29:29'),
(6, 1, 'CREATE', 'persons', 'Created new persons: andes ban andese', '2026-02-22 00:30:59'),
(7, 1, 'CREATE', 'persons', 'Created new persons: louie ban andes', '2026-02-22 00:36:36'),
(8, 1, 'DELETE', 'persons', 'Deleted persons (ID: 26): louie ban andes', '2026-02-22 00:37:01');

-- --------------------------------------------------------

--
-- Table structure for table `baptismal_records`
--

CREATE TABLE `baptismal_records` (
  `baptism_id` int(11) NOT NULL,
  `person_id` int(11) NOT NULL,
  `baptism_date` date DEFAULT NULL,
  `priest_id` int(11) NOT NULL,
  `father_id` int(11) DEFAULT NULL,
  `mother_id` int(11) DEFAULT NULL,
  `book_no` int(11) NOT NULL,
  `page_no` int(11) NOT NULL,
  `line_no` int(11) NOT NULL,
  `godparents` text NOT NULL,
  `remarks` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `baptismal_records`
--

INSERT INTO `baptismal_records` (`baptism_id`, `person_id`, `baptism_date`, `priest_id`, `father_id`, `mother_id`, `book_no`, `page_no`, `line_no`, `godparents`, `remarks`) VALUES
(1, 8, '2026-02-14', 6, 8, 8, 54, 6, 0, '', ''),
(2, 8, '2026-02-12', 8, 6, 6, 3, 3, 0, '', '');

-- --------------------------------------------------------

--
-- Table structure for table `beneficiary_logs`
--

CREATE TABLE `beneficiary_logs` (
  `log_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `person_id` int(11) NOT NULL,
  `aid_received` text NOT NULL,
  `date_given` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `burial_records`
--

CREATE TABLE `burial_records` (
  `burial_id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `death_date` date DEFAULT NULL,
  `burial_date` date DEFAULT NULL,
  `cause_of_death` varchar(255) DEFAULT NULL,
  `priest_id` int(11) DEFAULT NULL,
  `place_of_interment` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cemetery_records`
--

CREATE TABLE `cemetery_records` (
  `lot_id` int(11) NOT NULL,
  `deceased_id` int(11) NOT NULL,
  `block_no` varchar(10) NOT NULL,
  `row_no` varchar(10) NOT NULL,
  `lot_type` enum('Common','Apartment-Type','Private') NOT NULL,
  `lease_start` date NOT NULL,
  `lease_end` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cemetery_records`
--

INSERT INTO `cemetery_records` (`lot_id`, `deceased_id`, `block_no`, `row_no`, `lot_type`, `lease_start`, `lease_end`) VALUES
(1, 24, '09', '7', 'Apartment-Type', '2026-01-30', '2026-02-28');

-- --------------------------------------------------------

--
-- Table structure for table `confirmation_records`
--

CREATE TABLE `confirmation_records` (
  `confirmation_id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `confirmation_date` date DEFAULT NULL,
  `confirming_bishop` varchar(150) DEFAULT NULL,
  `sponsor_names` text DEFAULT NULL,
  `registry_book_no` varchar(50) DEFAULT NULL,
  `page_no` int(11) DEFAULT NULL,
  `entry_no` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `confirmation_records`
--

INSERT INTO `confirmation_records` (`confirmation_id`, `person_id`, `confirmation_date`, `confirming_bishop`, `sponsor_names`, `registry_book_no`, `page_no`, `entry_no`) VALUES
(1, 8, '2026-02-07', 'a', 'a', '', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `document_requests`
--

CREATE TABLE `document_requests` (
  `request_id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `requester_name` varchar(150) DEFAULT NULL,
  `document_type` enum('Baptismal Certificate','Confirmation Certificate','Marriage Certificate','Good Moral') DEFAULT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `request_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('Pending','Processing','Ready for Pickup','Released') DEFAULT NULL,
  `payment_status` enum('Unpaid','Paid') DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_requests`
--

INSERT INTO `document_requests` (`request_id`, `person_id`, `requester_name`, `document_type`, `purpose`, `request_date`, `status`, `payment_status`, `amount_paid`) VALUES
(2, 9, NULL, 'Baptismal Certificate', 'inda', '2026-02-21 10:25:26', 'Processing', 'Unpaid', 0.00),
(3, 9, NULL, 'Marriage Certificate', 'in', '2026-02-21 10:47:29', 'Processing', 'Unpaid', 12.00);

-- --------------------------------------------------------

--
-- Table structure for table `donations`
--

CREATE TABLE `donations` (
  `donation_id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `donor_name` varchar(150) NOT NULL DEFAULT '''Anonymous''',
  `amount` decimal(10,2) DEFAULT NULL,
  `donation_type` enum('Tithe','Love Offering','Project Donation','Mass Intention Fee') DEFAULT NULL,
  `date_received` timestamp NULL DEFAULT current_timestamp(),
  `received_by_user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `donations`
--

INSERT INTO `donations` (`donation_id`, `person_id`, `donor_name`, `amount`, `donation_type`, `date_received`, `received_by_user_id`) VALUES
(4, 25, 'Donor', 3232.00, 'Love Offering', '2026-02-22 01:07:40', NULL),
(5, 24, 'Donor', 32424325.00, 'Project Donation', '2026-02-22 01:08:11', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `file_attachments`
--

CREATE TABLE `file_attachments` (
  `file_id` int(11) NOT NULL,
  `record_type` enum('Baptismal','Marriage','Person','Asset','Requirement') DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `file_name` varchar(150) DEFAULT NULL,
  `upload_date` timestamp NULL DEFAULT current_timestamp(),
  `person_id` int(11) DEFAULT NULL,
  `marriage_id` int(11) DEFAULT NULL,
  `baptism_id` int(11) DEFAULT NULL,
  `asset_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `file_attachments`
--

INSERT INTO `file_attachments` (`file_id`, `record_type`, `record_id`, `file_path`, `file_name`, `upload_date`, `person_id`, `marriage_id`, `baptism_id`, `asset_id`) VALUES
(1, 'Person', 3, 'aa', 'magpakaon', '2026-02-22 02:36:58', 25, NULL, NULL, NULL),
(2, 'Asset', 3, 'uploads/1771729734_vite.svg', 'vite.svg', '2026-02-22 03:08:54', 25, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `financial_ledger`
--

CREATE TABLE `financial_ledger` (
  `trans_id` int(11) NOT NULL,
  `trans_type` enum('Income','Expense') DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `trans_date` date DEFAULT NULL,
  `encoded_by` int(11) DEFAULT NULL,
  `description` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `financial_ledger`
--

INSERT INTO `financial_ledger` (`trans_id`, `trans_type`, `category`, `amount`, `trans_date`, `encoded_by`, `description`) VALUES
(1, 'Expense', 's', 1.00, '2026-02-21', NULL, 's');

-- --------------------------------------------------------

--
-- Table structure for table `households`
--

CREATE TABLE `households` (
  `household_id` int(11) NOT NULL,
  `household_name` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `barangay_area` varchar(100) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `households`
--

INSERT INTO `households` (`household_id`, `household_name`, `address`, `barangay_area`, `contact_number`) VALUES
(1, 'Garcia Residence', '789 San Jose St.', 'Rawis', '0919-555-4433');

-- --------------------------------------------------------

--
-- Table structure for table `marriage_records`
--

CREATE TABLE `marriage_records` (
  `marriage_id` int(11) NOT NULL,
  `groom_id` int(11) NOT NULL,
  `bride_id` int(11) NOT NULL,
  `marriage_date` date DEFAULT NULL,
  `priest_id` int(11) DEFAULT NULL,
  `license_no` varchar(100) NOT NULL,
  `witnesses` text NOT NULL,
  `book_no` int(11) NOT NULL,
  `page_no` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `marriage_records`
--

INSERT INTO `marriage_records` (`marriage_id`, `groom_id`, `bride_id`, `marriage_date`, `priest_id`, `license_no`, `witnesses`, `book_no`, `page_no`) VALUES
(1, 8, 6, '2026-02-07', 8, 'sss', '', 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `mass_intentions`
--

CREATE TABLE `mass_intentions` (
  `intention_id` int(11) NOT NULL,
  `mass_date` date DEFAULT NULL,
  `mass_time` time DEFAULT NULL,
  `type` enum('Soul','Thanksgiving','Healing','Petition') NOT NULL,
  `offered_by` varchar(255) NOT NULL,
  `intention_names` text NOT NULL,
  `is_paid` tinyint(1) NOT NULL DEFAULT 0,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `ledger_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mass_intentions`
--

INSERT INTO `mass_intentions` (`intention_id`, `mass_date`, `mass_time`, `type`, `offered_by`, `intention_names`, `is_paid`, `is_read`, `ledger_id`) VALUES
(1, '2026-02-22', NULL, 'Healing', 'Parishioner', 'er', 1, 0, NULL),
(2, '2026-02-22', NULL, 'Soul', 'Parishioner', 'qe', 1, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ministries`
--

CREATE TABLE `ministries` (
  `ministry_id` int(11) NOT NULL,
  `ministry_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ministries`
--

INSERT INTO `ministries` (`ministry_id`, `ministry_name`) VALUES
(1, 'Pangalan ng Ministry');

-- --------------------------------------------------------

--
-- Table structure for table `notification_logs`
--

CREATE TABLE `notification_logs` (
  `notif_id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `message_body` text DEFAULT NULL,
  `notif_type` enum('SMS','Email') DEFAULT NULL,
  `recipient_address` varchar(255) DEFAULT NULL,
  `sent_status` enum('Pending','Sent','Failed') NOT NULL DEFAULT 'Pending',
  `sent_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_logs`
--

INSERT INTO `notification_logs` (`notif_id`, `person_id`, `message_body`, `notif_type`, `recipient_address`, `sent_status`, `sent_at`) VALUES
(1, 24, 'jkjk', 'Email', NULL, 'Pending', '2026-02-22 02:38:42');

-- --------------------------------------------------------

--
-- Table structure for table `parish_assets`
--

CREATE TABLE `parish_assets` (
  `asset_id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `category` enum('Liturgical','Electronics','Furniture','Vehicle') NOT NULL,
  `status` enum('Good','Under Repair','For Disposal') NOT NULL,
  `acquisition_date` date NOT NULL,
  `value` decimal(15,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parish_assets`
--

INSERT INTO `parish_assets` (`asset_id`, `item_name`, `category`, `status`, `acquisition_date`, `value`) VALUES
(1, 's', 'Furniture', 'Good', '2026-02-21', 1.00);

-- --------------------------------------------------------

--
-- Table structure for table `parish_config`
--

CREATE TABLE `parish_config` (
  `config_key` varchar(50) NOT NULL,
  `config_value` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parish_config`
--

INSERT INTO `parish_config` (`config_key`, `config_value`) VALUES
('ka', 'osiajosi');

-- --------------------------------------------------------

--
-- Table structure for table `parish_schedules`
--

CREATE TABLE `parish_schedules` (
  `schedule_id` int(11) NOT NULL,
  `event_title` varchar(200) DEFAULT NULL,
  `event_type` enum('Mass','Seminar','Wedding','Baptism','Meeting','Fiesta') DEFAULT NULL,
  `start_datetime` datetime DEFAULT NULL,
  `end_datetime` datetime DEFAULT NULL,
  `location` varchar(150) NOT NULL DEFAULT '''Parish Church''',
  `assigned_priest` varchar(150) DEFAULT NULL,
  `status` enum('Scheduled','Completed','Cancelled') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parish_schedules`
--

INSERT INTO `parish_schedules` (`schedule_id`, `event_title`, `event_type`, `start_datetime`, `end_datetime`, `location`, `assigned_priest`, `status`) VALUES
(1, 'admin', 'Seminar', '2026-02-21 21:01:00', '2026-02-21 12:03:00', 'Parish Church', '', 'Scheduled');

-- --------------------------------------------------------

--
-- Table structure for table `parish_volunteers`
--

CREATE TABLE `parish_volunteers` (
  `volunteer_id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `ministry_id` int(11) DEFAULT NULL,
  `role` varchar(100) NOT NULL DEFAULT '''Member''',
  `date_joined` date DEFAULT NULL,
  `status` enum('Active','Inactive','On Leave') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `perm_id` int(11) NOT NULL,
  `perm_name` varchar(100) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`perm_id`, `perm_name`, `description`) VALUES
(1, 'manage_all', 'Full access sa lahat ng modules'),
(2, 'view_records', 'Maaaring tumingin ng records'),
(3, 'edit_records', 'Maaaring mag-update ng records'),
(4, 'manage_finances', 'Maaaring mag-encode ng finances'),
(5, 'view_reports', 'Maaaring tumingin ng reports');

-- --------------------------------------------------------

--
-- Table structure for table `persons`
--

CREATE TABLE `persons` (
  `person_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(10) NOT NULL,
  `gender` enum('Male','Female') NOT NULL,
  `birth_date` date NOT NULL,
  `birth_place` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `contact_no` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `civil_status` enum('Single','Married','Widowed') NOT NULL,
  `is_alive` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `household_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `persons`
--

INSERT INTO `persons` (`person_id`, `first_name`, `middle_name`, `last_name`, `suffix`, `gender`, `birth_date`, `birth_place`, `address`, `contact_no`, `email`, `civil_status`, `is_alive`, `created_at`, `household_id`) VALUES
(2, 'Super', 'Admin', 'User', '', 'Male', '1990-01-01', 'Legazpi City', 'Parish Office', '09123456789', 'admin@church.com', 'Single', 1, '2026-02-20 09:32:13', NULL),
(5, 'Maria', 'De Los Santos', 'Clara', '', 'Female', '1998-10-23', 'Manila', 'Poblacion', '09180002222', 'secretary@church.com', 'Single', 1, '2026-02-21 05:13:46', NULL),
(6, 'Juan', 'Ibarra', 'Crisostomo', '', 'Male', '1990-12-30', 'San Diego', 'San Juan St.', '09190003333', 'treasurer@church.com', 'Married', 1, '2026-02-21 05:13:46', NULL),
(8, 'Fr. Jose', 'Rizal', 'Mercado', '', 'Male', '1980-06-19', 'Calamba', 'Parish Convent', '09171112222', 'priest@church.com', 'Single', 1, '2026-02-21 05:09:34', NULL),
(9, 'johnrey', 'admin', 'andes', '', 'Male', '2026-02-09', '', '', '09318938648', 'andesjohnrey35@gmail.com', 'Single', 1, '2026-02-21 06:19:05', NULL),
(24, 'johnrey', 'bantigue', 'andes', '', 'Male', '2026-02-18', 'banquerohan legazpi cty', 'banquerohan resetellement site', '00909909', 'andesjohnreya35@gmail.com', 'Single', 1, '2026-02-22 00:29:29', NULL),
(25, 'andes', 'ban', 'andese', '', 'Male', '2026-02-21', 'nn', 'a', '00909909', 'an@gmail.com', 'Single', 1, '2026-02-22 00:30:59', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `requirement_checklists`
--

CREATE TABLE `requirement_checklists` (
  `check_id` int(11) NOT NULL,
  `category` enum('Baptism','Marriage','Confirmation') DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `requirement_name` varchar(100) DEFAULT NULL,
  `is_submitted` tinyint(1) DEFAULT 0,
  `date_submitted` date DEFAULT NULL,
  `baptism_id` int(11) DEFAULT NULL,
  `marriage_id` int(11) DEFAULT NULL,
  `confirmation_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `requirement_checklists`
--

INSERT INTO `requirement_checklists` (`check_id`, `category`, `record_id`, `requirement_name`, `is_submitted`, `date_submitted`, `baptism_id`, `marriage_id`, `confirmation_id`) VALUES
(2, 'Marriage', NULL, 'lioska', 0, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_name` enum('Admin','Priest','Secretary','Treasurer') NOT NULL,
  `perm_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`role_name`, `perm_id`) VALUES
('Admin', 1);

-- --------------------------------------------------------

--
-- Table structure for table `sacramental_annotations`
--

CREATE TABLE `sacramental_annotations` (
  `annotation_id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `annotation_text` text DEFAULT NULL,
  `date_recorded` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sacramental_annotations`
--

INSERT INTO `sacramental_annotations` (`annotation_id`, `person_id`, `annotation_text`, `date_recorded`) VALUES
(1, 24, 'osooslq', '2026-02-22 02:39:59');

-- --------------------------------------------------------

--
-- Table structure for table `social_programs`
--

CREATE TABLE `social_programs` (
  `program_id` int(11) NOT NULL,
  `program_name` varchar(255) NOT NULL,
  `objective` text NOT NULL,
  `budget` decimal(15,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_users`
--

CREATE TABLE `system_users` (
  `user_id` int(11) NOT NULL,
  `person_id` int(11) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `user_role` enum('Admin','Priest','Secretary','Treasurer') NOT NULL DEFAULT 'Secretary',
  `last_login` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_users`
--

INSERT INTO `system_users` (`user_id`, `person_id`, `username`, `password_hash`, `user_role`, `last_login`) VALUES
(1, 2, 'admin', '21232f297a57a5a743894a0e4a801fc3', 'Admin', '2026-02-22 11:55:10'),
(3, 8, 'father_jose', 'cb22c7a815b61cda7796d81780547006', 'Priest', '2026-02-21 14:48:24'),
(4, 5, 'secretary_maria', 'ad31b430bcdcd1aeb0dc3a10069e229c', 'Secretary', '2026-02-22 10:31:53'),
(5, 6, 'treasurer_juan', 'a33dd218d8636b2567f5c9e2a9c8d845', 'Treasurer', '2026-02-21 13:14:17');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `asset_maintenance`
--
ALTER TABLE `asset_maintenance`
  ADD PRIMARY KEY (`maint_id`),
  ADD KEY `fk_maintenance_asset` (`asset_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `fk_al_user_final` (`user_id`);

--
-- Indexes for table `baptismal_records`
--
ALTER TABLE `baptismal_records`
  ADD PRIMARY KEY (`baptism_id`),
  ADD KEY `fk_br_person_final` (`person_id`),
  ADD KEY `fk_br_father` (`father_id`),
  ADD KEY `fk_br_mother` (`mother_id`),
  ADD KEY `fk_br_priest_final` (`priest_id`);

--
-- Indexes for table `beneficiary_logs`
--
ALTER TABLE `beneficiary_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD UNIQUE KEY `unique_beneficiary_entry` (`program_id`,`person_id`,`date_given`),
  ADD KEY `fk_beneficiary_person` (`person_id`);

--
-- Indexes for table `burial_records`
--
ALTER TABLE `burial_records`
  ADD PRIMARY KEY (`burial_id`),
  ADD KEY `fk_burial_person` (`person_id`),
  ADD KEY `fk_burial_priest` (`priest_id`);

--
-- Indexes for table `cemetery_records`
--
ALTER TABLE `cemetery_records`
  ADD PRIMARY KEY (`lot_id`),
  ADD KEY `fk_cemetery_deceased` (`deceased_id`);

--
-- Indexes for table `confirmation_records`
--
ALTER TABLE `confirmation_records`
  ADD PRIMARY KEY (`confirmation_id`),
  ADD KEY `fk_confirmation_person` (`person_id`);

--
-- Indexes for table `document_requests`
--
ALTER TABLE `document_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `person_id` (`person_id`);

--
-- Indexes for table `donations`
--
ALTER TABLE `donations`
  ADD PRIMARY KEY (`donation_id`),
  ADD KEY `fk_don_person_final` (`person_id`),
  ADD KEY `fk_don_user_final` (`received_by_user_id`);

--
-- Indexes for table `file_attachments`
--
ALTER TABLE `file_attachments`
  ADD PRIMARY KEY (`file_id`),
  ADD KEY `fk_file_person` (`person_id`),
  ADD KEY `fk_file_marriage` (`marriage_id`),
  ADD KEY `fk_file_baptism` (`baptism_id`),
  ADD KEY `fk_file_asset` (`asset_id`);

--
-- Indexes for table `financial_ledger`
--
ALTER TABLE `financial_ledger`
  ADD PRIMARY KEY (`trans_id`),
  ADD KEY `fk_ledger_encoded_by_final` (`encoded_by`);

--
-- Indexes for table `households`
--
ALTER TABLE `households`
  ADD PRIMARY KEY (`household_id`);

--
-- Indexes for table `marriage_records`
--
ALTER TABLE `marriage_records`
  ADD PRIMARY KEY (`marriage_id`),
  ADD KEY `fk_mr_priest_final` (`priest_id`),
  ADD KEY `fk_mr_groom_final` (`groom_id`),
  ADD KEY `fk_mr_bride_final` (`bride_id`);

--
-- Indexes for table `mass_intentions`
--
ALTER TABLE `mass_intentions`
  ADD PRIMARY KEY (`intention_id`),
  ADD KEY `fk_intention_ledger` (`ledger_id`);

--
-- Indexes for table `ministries`
--
ALTER TABLE `ministries`
  ADD PRIMARY KEY (`ministry_id`);

--
-- Indexes for table `notification_logs`
--
ALTER TABLE `notification_logs`
  ADD PRIMARY KEY (`notif_id`),
  ADD KEY `fk_notification_person` (`person_id`),
  ADD KEY `idx_notification_recipient` (`recipient_address`);

--
-- Indexes for table `parish_assets`
--
ALTER TABLE `parish_assets`
  ADD PRIMARY KEY (`asset_id`);

--
-- Indexes for table `parish_config`
--
ALTER TABLE `parish_config`
  ADD PRIMARY KEY (`config_key`),
  ADD UNIQUE KEY `config_key` (`config_key`);

--
-- Indexes for table `parish_schedules`
--
ALTER TABLE `parish_schedules`
  ADD PRIMARY KEY (`schedule_id`);

--
-- Indexes for table `parish_volunteers`
--
ALTER TABLE `parish_volunteers`
  ADD PRIMARY KEY (`volunteer_id`),
  ADD KEY `fk_volunteer_ministry` (`ministry_id`),
  ADD KEY `fk_pv_person_final` (`person_id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`perm_id`);

--
-- Indexes for table `persons`
--
ALTER TABLE `persons`
  ADD PRIMARY KEY (`person_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_person_household` (`household_id`);

--
-- Indexes for table `requirement_checklists`
--
ALTER TABLE `requirement_checklists`
  ADD PRIMARY KEY (`check_id`),
  ADD KEY `fk_req_baptism` (`baptism_id`),
  ADD KEY `fk_req_marriage` (`marriage_id`),
  ADD KEY `fk_req_confirmation` (`confirmation_id`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_name`,`perm_id`),
  ADD KEY `fk_rp_permission` (`perm_id`);

--
-- Indexes for table `sacramental_annotations`
--
ALTER TABLE `sacramental_annotations`
  ADD PRIMARY KEY (`annotation_id`),
  ADD KEY `fk_annotation_person` (`person_id`);

--
-- Indexes for table `social_programs`
--
ALTER TABLE `social_programs`
  ADD PRIMARY KEY (`program_id`);

--
-- Indexes for table `system_users`
--
ALTER TABLE `system_users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `fk_su_person_final` (`person_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `asset_maintenance`
--
ALTER TABLE `asset_maintenance`
  MODIFY `maint_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `baptismal_records`
--
ALTER TABLE `baptismal_records`
  MODIFY `baptism_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `beneficiary_logs`
--
ALTER TABLE `beneficiary_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `burial_records`
--
ALTER TABLE `burial_records`
  MODIFY `burial_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cemetery_records`
--
ALTER TABLE `cemetery_records`
  MODIFY `lot_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `confirmation_records`
--
ALTER TABLE `confirmation_records`
  MODIFY `confirmation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `document_requests`
--
ALTER TABLE `document_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `donations`
--
ALTER TABLE `donations`
  MODIFY `donation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `file_attachments`
--
ALTER TABLE `file_attachments`
  MODIFY `file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `financial_ledger`
--
ALTER TABLE `financial_ledger`
  MODIFY `trans_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `households`
--
ALTER TABLE `households`
  MODIFY `household_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `marriage_records`
--
ALTER TABLE `marriage_records`
  MODIFY `marriage_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `mass_intentions`
--
ALTER TABLE `mass_intentions`
  MODIFY `intention_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ministries`
--
ALTER TABLE `ministries`
  MODIFY `ministry_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notification_logs`
--
ALTER TABLE `notification_logs`
  MODIFY `notif_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `parish_assets`
--
ALTER TABLE `parish_assets`
  MODIFY `asset_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `parish_schedules`
--
ALTER TABLE `parish_schedules`
  MODIFY `schedule_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `parish_volunteers`
--
ALTER TABLE `parish_volunteers`
  MODIFY `volunteer_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `perm_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `persons`
--
ALTER TABLE `persons`
  MODIFY `person_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `requirement_checklists`
--
ALTER TABLE `requirement_checklists`
  MODIFY `check_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sacramental_annotations`
--
ALTER TABLE `sacramental_annotations`
  MODIFY `annotation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `social_programs`
--
ALTER TABLE `social_programs`
  MODIFY `program_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_users`
--
ALTER TABLE `system_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `asset_maintenance`
--
ALTER TABLE `asset_maintenance`
  ADD CONSTRAINT `fk_maintenance_asset` FOREIGN KEY (`asset_id`) REFERENCES `parish_assets` (`asset_id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_al_user_final` FOREIGN KEY (`user_id`) REFERENCES `system_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `baptismal_records`
--
ALTER TABLE `baptismal_records`
  ADD CONSTRAINT `fk_br_father` FOREIGN KEY (`father_id`) REFERENCES `persons` (`person_id`),
  ADD CONSTRAINT `fk_br_mother` FOREIGN KEY (`mother_id`) REFERENCES `persons` (`person_id`),
  ADD CONSTRAINT `fk_br_person_final` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`),
  ADD CONSTRAINT `fk_br_priest_final` FOREIGN KEY (`priest_id`) REFERENCES `persons` (`person_id`);

--
-- Constraints for table `beneficiary_logs`
--
ALTER TABLE `beneficiary_logs`
  ADD CONSTRAINT `fk_beneficiary_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_beneficiary_program` FOREIGN KEY (`program_id`) REFERENCES `social_programs` (`program_id`) ON DELETE CASCADE;

--
-- Constraints for table `burial_records`
--
ALTER TABLE `burial_records`
  ADD CONSTRAINT `fk_burial_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_burial_priest` FOREIGN KEY (`priest_id`) REFERENCES `persons` (`person_id`) ON DELETE SET NULL;

--
-- Constraints for table `cemetery_records`
--
ALTER TABLE `cemetery_records`
  ADD CONSTRAINT `fk_cemetery_deceased` FOREIGN KEY (`deceased_id`) REFERENCES `persons` (`person_id`);

--
-- Constraints for table `confirmation_records`
--
ALTER TABLE `confirmation_records`
  ADD CONSTRAINT `fk_confirmation_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE CASCADE;

--
-- Constraints for table `document_requests`
--
ALTER TABLE `document_requests`
  ADD CONSTRAINT `fk_dr_person_final` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE SET NULL;

--
-- Constraints for table `donations`
--
ALTER TABLE `donations`
  ADD CONSTRAINT `fk_don_person_final` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_don_user_final` FOREIGN KEY (`received_by_user_id`) REFERENCES `system_users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `file_attachments`
--
ALTER TABLE `file_attachments`
  ADD CONSTRAINT `fk_file_asset` FOREIGN KEY (`asset_id`) REFERENCES `parish_assets` (`asset_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_file_baptism` FOREIGN KEY (`baptism_id`) REFERENCES `baptismal_records` (`baptism_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_file_marriage` FOREIGN KEY (`marriage_id`) REFERENCES `marriage_records` (`marriage_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_file_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE CASCADE;

--
-- Constraints for table `financial_ledger`
--
ALTER TABLE `financial_ledger`
  ADD CONSTRAINT `fk_ledger_encoded_by_final` FOREIGN KEY (`encoded_by`) REFERENCES `system_users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `marriage_records`
--
ALTER TABLE `marriage_records`
  ADD CONSTRAINT `fk_mr_bride_final` FOREIGN KEY (`bride_id`) REFERENCES `persons` (`person_id`),
  ADD CONSTRAINT `fk_mr_groom_final` FOREIGN KEY (`groom_id`) REFERENCES `persons` (`person_id`),
  ADD CONSTRAINT `fk_mr_priest_final` FOREIGN KEY (`priest_id`) REFERENCES `persons` (`person_id`);

--
-- Constraints for table `mass_intentions`
--
ALTER TABLE `mass_intentions`
  ADD CONSTRAINT `fk_intention_ledger` FOREIGN KEY (`ledger_id`) REFERENCES `financial_ledger` (`trans_id`) ON DELETE SET NULL;

--
-- Constraints for table `notification_logs`
--
ALTER TABLE `notification_logs`
  ADD CONSTRAINT `fk_notification_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE CASCADE;

--
-- Constraints for table `parish_volunteers`
--
ALTER TABLE `parish_volunteers`
  ADD CONSTRAINT `fk_pv_person_final` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_volunteer_ministry` FOREIGN KEY (`ministry_id`) REFERENCES `ministries` (`ministry_id`) ON DELETE SET NULL;

--
-- Constraints for table `persons`
--
ALTER TABLE `persons`
  ADD CONSTRAINT `fk_person_household` FOREIGN KEY (`household_id`) REFERENCES `households` (`household_id`) ON DELETE SET NULL;

--
-- Constraints for table `requirement_checklists`
--
ALTER TABLE `requirement_checklists`
  ADD CONSTRAINT `fk_req_baptism` FOREIGN KEY (`baptism_id`) REFERENCES `baptismal_records` (`baptism_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_req_confirmation` FOREIGN KEY (`confirmation_id`) REFERENCES `confirmation_records` (`confirmation_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_req_marriage` FOREIGN KEY (`marriage_id`) REFERENCES `marriage_records` (`marriage_id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_rp_permission` FOREIGN KEY (`perm_id`) REFERENCES `permissions` (`perm_id`) ON DELETE CASCADE;

--
-- Constraints for table `sacramental_annotations`
--
ALTER TABLE `sacramental_annotations`
  ADD CONSTRAINT `fk_annotation_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE CASCADE;

--
-- Constraints for table `system_users`
--
ALTER TABLE `system_users`
  ADD CONSTRAINT `fk_su_person_final` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
