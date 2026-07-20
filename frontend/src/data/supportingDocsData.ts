export const SUPPORTING_DOCS_DATA: Record<string, any[]> = {
  'q_1_1': [
    { id: 'doc_q_1_1_1', title: 'Official Implementation Date', description: 'Date of official implementation of the State/UT Startup Policy, as per the Government Order or Notification.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_1_1_2', title: 'G.O. / Policy Document', description: 'G.O. / Notification and Policy Document for State / UT Startup Policy', mandatory: true, acceptedFileTypes: ['.pdf', '.doc', '.docx'], maxFiles: 2, maxFileSize: 10 }
  ],
  'q_1_2': [
    { id: 'doc_q_1_2_1', title: 'G.O. for Renewal', description: 'G.O. / Notification for Policy Renewal or Amendment, if any', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_1_2_2', title: 'Amended Policy Documents', description: 'Policy Documents / Amended Policy Documents for the above, if any', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_1_2_3', title: 'Sub Policies', description: 'Details of Sub Policies within the State Startup Policy', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_1_2_4', title: 'Renewal Notifications', description: 'List of Government Orders or Notifications for renewal/upgradation of Startup Policies, if any', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_1_3': [
    { id: 'doc_q_1_3_1', title: 'Nodal Department G.O.', description: 'G.O. / Notification citing the Nodal Department', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_1_3_2', title: 'Team Structure', description: 'Detailed documents showcasing team structure of the Nodal Department', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_1_3_3', title: 'Schemes List', description: 'Total number of schemes and policies facilitating Startups in the State/UT', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 2, maxFileSize: 10 }
  ],
  'q_1_4': [
    { id: 'doc_q_1_4_1', title: 'Budget Documents', description: 'Budget Documents, G.O.s and Notifications related to Startup support - for both Nodal and other supporting Departments including details of allocated and approved budget', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_1_4_2', title: 'Annual Budget Copies', description: 'Copies of annual budget documents clearly showing line items or allocations for startups and related activities.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_1_5': [
    { id: 'doc_q_1_5_1', title: 'Departments List', description: 'List of Departments providing institutional support to Startups', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_1_5_2', title: 'Beneficiary Startups List', description: 'List and number of Startups that have availed incentives, scheme-wise / initiative-wise', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_1_5_3', title: 'Scheme Support Details', description: 'Details of support provided under each scheme', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_1_5_4', title: 'Other Departments Support Docs', description: 'Government orders / notifications / circulars issued by other departments for startup support', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 10, maxFileSize: 10 }
  ],
  'q_2_1': [
    { id: 'doc_q_2_1_1', title: 'List of Priority Sectors', description: 'List of identified Priority Sectors within the State / Union Territory.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_2_1_2', title: 'State Notification / Government Order', description: 'Details of state notification/government order/approval order in public domain outlining possible Priority Sectors.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_2_2': [
    { id: 'doc_q_2_2_1', title: 'Initiatives Details', description: 'Details of schemes / policies / initiatives / activities and other support provided to Startups within Priority Sectors.', mandatory: true, acceptedFileTypes: ['.pdf', '.doc', '.docx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_2_2_2', title: 'Scheme Documents / G.O.', description: 'Scheme documents, government orders, or official notifications detailing each initiative or policy launched for priority sectors.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_2_2_3', title: 'Press Releases / Reports', description: 'Press releases, official website screenshots, or annual reports highlighting these initiatives.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_2_2_4', title: 'Beneficiary Startups List', description: 'List of beneficiary Startups within the identified Priority Sectors.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx', '.csv'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_2_3': [
    { id: 'doc_q_2_3_1', title: 'Deep Tech Scheme Documents', description: 'Scheme documents, G.O. or circulars detailing the Deep Tech and AI-focused initiatives or programs', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_2_3_2', title: 'Event Agendas / Reports', description: 'Agendas, brochures, or reports from knowledge-sharing seminars, workshops, hackathons, or conferences conducted.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_2_3_3', title: 'Participant / Beneficiary Lists', description: 'Participant lists or beneficiary lists mentioning startup names supported under each initiative.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_2_3_4', title: 'Collaboration Agreements / MoU', description: 'Collaboration agreements, MoU or partnership documents with industry bodies, academia, or global organizations for Deep Tech/AI.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_2_3_5', title: 'Media Coverage / Photos', description: 'Media coverage, photographs, or press releases highlighting these initiatives.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_2_3_6', title: 'Outcome Reports', description: 'Outcome reports detailing the number and type of startups supported.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_3_1': [
    { id: 'doc_q_3_1_1', title: 'Categorization Details', description: 'Details of categorization of Tier 2, Tier 3 and Tier 4 districts and towns.', mandatory: true, acceptedFileTypes: ['.pdf', '.doc', '.docx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_1_2', title: 'List of Districts & Categorization', description: 'List of all districts with respective categorization in respective State/UT.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_1_3', title: 'List of Startups/Entrepreneurs', description: 'List of startups/entrepreneurs with location details (Tier 2, Tier 3 and Tier 4 regions).', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_1_4', title: 'Proof of Support', description: 'Proof of support (grants, incubation, market access, capacity building) given to startups from Tier 2, Tier 3 and Tier 4 regions (letters, sanction orders, MoUs, event reports).', mandatory: true, acceptedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'], maxFiles: 15, maxFileSize: 10 },
    { id: 'doc_q_3_1_5', title: 'Case Studies / Success Stories', description: 'List of case studies or success stories of entrepreneurs or startups from Tier 2, Tier 3, and Tier 4 towns/cities that have been supported by the State/UT government, along with the names of their respective districts.', mandatory: true, acceptedFileTypes: ['.pdf', '.doc', '.docx'], maxFiles: 10, maxFileSize: 10 },
    { id: 'doc_q_3_1_6', title: 'Startup Registration Data', description: 'Startup Registration Data from state platforms and DPIIT-recognised startup database with location filters.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx', '.csv'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_1_7', title: 'Beneficiary Report', description: 'District-wise/region-wise beneficiary report from state programs.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_1_8', title: 'State Startup Policy', description: 'State startup policy documents with schemes targeting smaller cities/rural areas.', mandatory: true, acceptedFileTypes: ['.pdf', '.doc', '.docx'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_3_2': [
    { id: 'doc_q_3_2_1', title: 'List of Aspirational Districts', description: 'List of aspirational districts in your State/UT.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_2_2', title: 'Event Reports / Agendas', description: 'Event reports, agendas and minutes of workshops, seminars, speaker sessions or awareness events held in Aspirational Districts.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_2_3', title: 'Geo-tagged Photos / Media', description: 'Geo-tagged photos, videos, or media coverage validating the events.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 10, maxFileSize: 10 },
    { id: 'doc_q_3_2_4', title: 'Official Invitations / G.O.', description: 'Official invitations, G.O. or communications sent to stakeholders and participants.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_2_5', title: 'Attendance Sheets', description: 'Attendance sheets or participant lists showing representation from the district.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_2_6', title: 'Post-event Summaries', description: 'Post-event summaries, feedback reports or impact notes prepared by the nodal department or partner agencies.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_2_7', title: 'Collaboration Documents', description: 'Collaboration documents with local institutions, district administration or implementing partners for conducting the initiatives.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_3_3': [
    { id: 'doc_q_3_3_1', title: 'Special Incentives List', description: 'List the special incentives provided by State/UT to women-led Startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_3_2', title: 'Policy / Scheme Documents', description: 'Policy or scheme documents covering incentives for women-led Startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_3_3', title: 'List of Women-led Startups', description: 'List of unique women-led Startups supported by State / UT and their Districts.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_3_4', title: 'BHASKAR Registry List', description: 'List of all women-led Startups in your state / UT registered on Bharat Startup Ecosystem Registry.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_3_4': [
    { id: 'doc_q_3_4_1', title: 'G.O. / Circulars', description: 'Government orders, circulars, or scheme documents detailing initiatives or programs for promoting entrepreneurship/startup awareness in educational institutions.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_4_2', title: 'Collaboration Agreements', description: 'Collaboration agreements, or partnership documents with educational boards, universities or private organizations.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_4_3', title: 'Event Agendas / Brochures', description: 'Event agendas, reports, or brochures from workshops, seminars, hackathons, or awareness camps held in schools and colleges.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_4_4', title: 'Attendance / Beneficiary Lists', description: 'Attendance sheets, beneficiary lists, or feedback forms from participating students or institutions.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_4_5', title: 'Media Coverage / Photos', description: 'Media coverage, photographs, or press releases highlighting these initiatives.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_3_4_6', title: 'Annual Activity Reports', description: 'Annual activity reports summarizing outreach efforts and the number of sessions/programs conducted.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_4_1': [
    { id: 'doc_q_4_1_1', title: 'List of Incubators', description: 'List of incubators (manufacturing and non-manufacturing) established or upgraded, along with their locations and functional status', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_4_1_2', title: 'Government Orders / MoUs', description: 'Government Orders (GO), Sanction Letters, or MoUs related to establishment/upgradation', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
  ],
  'q_5_1': [
    { id: 'doc_q_5_1_1', title: 'Infrastructure Initiatives List', description: 'List of infrastructure initiatives/programs undertaken for startups in Tier 2, Tier 3, and Tier 4 districts, along with objectives and locations.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_5_1_2', title: 'Government Orders / Budget', description: 'Government Orders (GO), Sanction Letters, or Budget Notifications approving the infrastructure initiatives.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_5_1_3', title: 'Photos of Projects', description: 'Photos of completed/ongoing infrastructure projects (co-working spaces, incubation buildings, etc.)', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 10, maxFileSize: 10 }
  ],
  'q_5_2': [
    { id: 'doc_q_5_2_1', title: 'District-wise Mapping', description: 'District-wise mapping of Tier 2, Tier 3 and Tier 4 regions where infrastructure initiatives have been implemented.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_5_2_2', title: 'GIS Maps / Summaries', description: 'GIS maps or summary tables showing percentage coverage of districts.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_5_2_3', title: 'MoU / Agreements', description: 'Any MoU/agreements with local bodies or institutions for infrastructure development.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_6_1': [
    { id: 'doc_q_6_1_1', title: 'Registered Stakeholders List', description: 'List of ecosystem stakeholders (startups, investors, mentors, academic institutions, etc.) registered on the State/UT Startup Portal', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_6_1_2', title: 'Backend Analytics / Dashboard', description: 'Backend user analytics or dashboard screenshots showing registration data', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_6_2': [
    { id: 'doc_q_6_2_1', title: 'Screenshots / URLs', description: 'Screenshots or URLs showing online application, grievance redressal, language support, PwD features, and internal dashboard.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 10, maxFileSize: 10 }
  ],
  'q_6_3': [
    { id: 'doc_q_6_3_1', title: 'Circulars / Notifications', description: 'Circulars, notifications, or communication related to promotion of BHASKAR and DPIIT recognition process and awareness campaigns.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_7_1': [
    { id: 'doc_q_7_1_1', title: 'Funds List', description: 'List of funds/funding instruments.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_7_1_2', title: 'Sanction Letters', description: 'List of Sanction letters to be provided.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_7_1_3', title: 'Proof of Release', description: 'Proof of release of funds.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_7_1_4', title: 'Budget Allocation Proof', description: 'Proof of Budget allocation for funds or funding instruments.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_7_1_5', title: 'Total Funds Disbursed Proof', description: 'Proof of the total amount of funds disbursed.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_7_1_6', title: 'Guideline Documents', description: 'List of Guideline Documents for the fund(s), with a mention of focus on Priority sector Startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_7_1_7', title: 'MoU / Agreements', description: 'List of MoU(s) signed, Agreements, Policy Documents etc.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_7_1_8', title: 'AIFs List', description: 'Total number and list of all the AIFs based in the State/UT.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_8_1': [
    { id: 'doc_q_8_1_1', title: 'Sanction Letters / GO', description: 'Sanction letters or GO (signed by a senior government official) to be provided.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_8_1_2', title: 'List of Funded Startups', description: 'List of Startups funded along with the disbursed funding amount.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_8_1_3', title: 'Proof of Release', description: 'Proof of release of funds (bank transaction details with beneficiary names).', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_8_1_4', title: 'Total Amount Disbursed', description: 'Also provide the total amount of funds disbursed.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_8_1_5', title: 'Scheme Documents / GO', description: 'Scheme documents / government orders / guidelines for each funding mechanism implemented by the State/UT.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_8_1_6', title: 'Utilization Certificates', description: 'Fund utilization certificates (UCs) or audited statements showing the actual funds disbursed to startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 10, maxFileSize: 10 }
  ],
  'q_8_2': [
    { id: 'doc_q_8_2_1', title: 'Summary Reports', description: 'Scheme-wise / program-wise summary reports detailing allocated vs. disbursed amounts.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_8_2_2', title: 'Sanction Orders', description: 'Sanction orders or approval letters confirming fund disbursement to individual startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 10, maxFileSize: 10 },
    { id: 'doc_q_8_2_3', title: 'Bank Statements', description: 'Bank statements or transaction proof (with sensitive details redacted) validating disbursement.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_8_2_4', title: 'Minutes of Meetings', description: 'Minutes of meetings or official notes approving fund release.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_8_2_5', title: 'Consolidated Statement', description: 'Consolidated summary statement certified by the finance/accounts department of the nodal agency.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_8_2_6', title: 'Average Disbursement Time', description: 'Summary table showing average disbursement time (in days) for each scheme/type of fund.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_8_2_7', title: 'Startup-wise Records', description: 'Startup-wise fund disbursement records showing dates of application, approval, and actual fund disbursement.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_8_2_8', title: 'Flowchart / SOP', description: 'Flowchart or SOP of disbursement process detailing steps, timelines, responsible authorities, and mode of disbursal.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_8_2_9', title: 'Online Portals Reports', description: 'Reports from online fund management portals (if applicable), validating time tracking.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 },
  ],
  'q_9_1': [
    { id: 'doc_q_9_1_1', title: 'Guidelines Document', description: 'Guideline document highlighting incentives for angel (individual/group/ network) investments.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_1_2', title: 'Events / Programs List', description: 'List of Events/programs and knowledge sessions conducted with reports and records of discussion.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_1_3', title: 'MoU with Fund Managers', description: 'Proof of MoU(s) with fund managers.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_1_4', title: 'Total Investors List', description: 'List of total investors.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_1_5', title: 'Facilitated Startups', description: 'List of startups facilitated by investors.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_1_6', title: 'Proof of Funds', description: 'Proof of funds from investors to Startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_1_7', title: 'Participation Evidence', description: 'Evidence of participation by startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_1_8', title: 'Engagement Initiatives', description: 'List of engagement initiatives conducted with investors.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_1_9', title: 'Event Reports / Agendas', description: 'Event reports, agendas and attendance lists from State/UT-led pitching sessions, demo days, investor meets or roadshows.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_9_2': [
    { id: 'doc_q_9_2_1', title: 'Successful Connections List', description: 'List mapping successful connections facilitated between startups and investors.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_2_2', title: 'Geo-tagged Photos / Videos', description: 'Geo-tagged photographs or videos from the facilitation events.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_2_3', title: 'Press Releases / Media', description: 'Press releases, media coverage, or official social media posts highlighting the facilitated connections or funding raised.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_9_2_4', title: 'Testimonials / Feedback', description: 'Testimonials or feedback forms from startups or investors acknowledging the connection facilitated.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 10, maxFileSize: 10 },
    { id: 'doc_q_9_2_5', title: 'Summary Report', description: 'Summary report prepared by the nodal agency detailing number of successful connections and brief outcomes.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 2, maxFileSize: 10 }
  ],
  'q_10_1': [
    { id: 'doc_q_10_1_1', title: 'Tender Documents / RFPs', description: 'List of RFPs/tender documents where relaxations have been provided to Startups.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_10_1_2', title: 'GO / Notifications', description: 'List of GO/Notifications for relaxation.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_10_1_3', title: 'Published Tender Links', description: 'Links of where tender document has been published.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 2, maxFileSize: 10 },
    { id: 'doc_q_10_1_4', title: 'Beneficiary Startups List', description: 'List of beneficiary Startups that have been awarded work-orders.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_10_2': [
    { id: 'doc_q_10_2_1', title: 'Aspirational Districts List', description: 'List of Aspirational Districts where Startups were provided purchase or work orders.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_10_2_2', title: 'Work Orders / Copies', description: 'Amount of Work Order that has been awarded and Copies of Tenders, POs and WOs issued to startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 15, maxFileSize: 10 },
    { id: 'doc_q_10_2_3', title: 'Consolidated Summary', description: 'Consolidated summary statement listing: Tender/PO/WO number, issuing department/agency, startup name, sector, date and value.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_10_2_4', title: 'Geo-tagged Docs / Proof', description: 'Geo-tagged documentation or business address proof validating that the work was executed in Aspirational Districts.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_10_2_5', title: 'Payment / Utilization Proofs', description: 'Payment confirmation documents, utilization certificates or transaction proofs.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_10_2_6', title: 'Annual Reports', description: 'Annual Reports highlighting procurement from startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_10_3': [
    { id: 'doc_q_10_3_1', title: 'Media Coverage / Press', description: 'Media coverage or press releases (if any) showcasing procurement from startups in priority sectors.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_10_3_2', title: 'Tender / Work Order Copies', description: 'Copies of tender documents, work orders, purchase orders, or pilot project sanction letters awarded to startups in identified priority sectors.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 10, maxFileSize: 10 },
    { id: 'doc_q_10_3_3', title: 'Supported Startups List', description: 'List of startups supported, mentioning sector alignment, type of opportunity and date awarded.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_10_3_4', title: 'Official Communications', description: 'Notifications or official communications from the nodal department highlighting the facilitation effort.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_11_1': [
    { id: 'doc_q_11_1_1', title: 'Market Linkage Initiatives', description: 'Provide details of initiatives undertaken by the State/UT to facilitate market linkages for startups.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_1_2', title: 'PPP Initiatives Details', description: 'Provide details of PPP initiatives with private players.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_1_3', title: 'Notification / Orders', description: 'Notification/order/document showing the objective, duration, and terms of engagement under the PPP.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_1_4', title: 'Implemented PPPs Summary', description: 'Summary list of PPPs implemented.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_1_5', title: 'Implementation Evidence', description: 'Evidence of implementation - progress reports, outcomes achieved, or utilization summaries.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_1_6', title: 'Circulars / Event Docs', description: 'Circulars, guidelines, or event documents for market linkage initiatives.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_1_7', title: 'Corporate Partnerships', description: 'Evidence of partnerships with corporates or industry networks for domestic market access.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_1_8', title: 'Beneficiary List', description: 'Beneficiary list of startups with type of market linkage.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_1_9', title: 'Event Reports / Feedback', description: 'Event reports, press notes, participation certificates, or feedback collected.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_11_2': [
    { id: 'doc_q_11_2_1', title: 'MoUs / Global Agreements', description: 'Copies of signed MoUs, agreements or partnership documents with global stakeholders.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 10, maxFileSize: 10 },
    { id: 'doc_q_11_2_2', title: 'Official Notifications', description: 'Official notifications or press releases issued by the State/UT government or nodal agency announcing these initiatives.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_2_3', title: 'Initiatives List', description: 'List of initiatives undertaken, mentioning name of partner, country, objective, and date of commencement.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_2_4', title: 'Reports / Presentations', description: 'Reports, presentations or event documents highlighting activities carried out under these initiatives.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_2_5', title: 'Event Reports / Brochures', description: 'Event reports, press releases, or joint program brochures evidencing partnership activation.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_2_6', title: 'Benefited Startups List', description: 'List of startups that benefited through exchange programs, soft landing, global mentorship, exposure trips, or cross-border pilots.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_11_2_7', title: 'Participation Evidence', description: 'Evidence of participation (e.g., selection letter, participation certificate, startup feedback) for each supported startup.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 10, maxFileSize: 10 }
  ],
  'q_12_1': [
    { id: 'doc_q_12_1_1', title: 'Government Order / Circular', description: 'Government Order / Notification / Circular / Scheme document clearly outlining the “Trusted Partner” approach or green channel.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_12_1_2', title: 'SOPs / Processes', description: 'Document describing processes or SOPs for expedited approvals, clearances or registrations.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_12_1_3', title: 'Implementing Departments', description: 'List of departments/agencies implementing the fast-track mechanism, along with the scope of services covered.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_12_1_4', title: 'Availed Startups Records', description: 'Records or Reports showing number of startups that have availed the green channel or fast-tracking benefits.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_12_1_5', title: 'Feedback / Testimonials', description: 'Feedback, testimonials or case examples of startups that have benefited from these initiatives.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_12_1_6', title: 'Flowcharts / Guidelines', description: 'Process flowcharts, internal departmental guidelines or workflow documents demonstrating how applications are prioritized.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_12_2': [
    { id: 'doc_q_12_2_1', title: 'Processing Time Reports', description: 'Reports, dashboards, or official records showing actual processing time for key approvals and clearances.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_12_2_2', title: 'Differentiated Timelines SOP', description: 'Documented process note / SOP / notification specifying differentiated timelines for DPIIT-recognized startups vs. other entities.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_12_2_3', title: 'Comparative Analysis', description: 'Comparative analysis / report highlighting average timelines separately for DPIIT-recognized startups and for other entities.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_12_2_4', title: 'Covered Approvals List', description: 'List of key approvals and clearances covered under the fast-track mechanism or reduced timeline framework.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_12_2_5', title: 'Sample Expedited Approvals', description: 'Testimonials, case studies or sample applications showing expedited approvals granted to startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_13_1': [
    { id: 'doc_q_13_1_1', title: 'Workshops List & Details', description: 'List of sensitization workshops/programs conducted for Startup Nodal Agency and other departments with date, topic, and target audience.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_13_1_2', title: 'Event Reports / Materials', description: 'Event reports, invitations, agendas, or training material used in the workshops.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_13_1_3', title: 'Photos / Attendance', description: 'Photographs, attendance sheets, or feedback forms from the sessions.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 10, maxFileSize: 10 }
  ],
  'q_13_2': [
    { id: 'doc_q_13_2_1', title: 'Capacity Programs List', description: 'List of capacity-building programs specifically conducted in Tier 2, Tier 3, and Tier 4 districts, along with location details.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_13_2_2', title: 'Sanction Letters / Brochures', description: 'Sanction letters, partner agreements and program brochures.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_13_3': [
    { id: 'doc_q_13_3_1', title: 'Cumulative Trained Officials', description: 'Cumulative list of government officials trained through these initiatives, categorized by department and district.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_13_3_2', title: 'Attendance / Feedback', description: 'Attendance records, registration forms, and post-training feedback or assessment reports.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_14_1': [
    { id: 'doc_q_14_1_1', title: 'Workshops Calendar', description: 'Calendar/schedule of capacity development sessions/workshops conducted to sensitize startups, including session dates, agenda, and target audience.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_14_1_2', title: 'Attendance & Materials', description: 'Attendance sheets, photos, feedback forms, and training materials used in these programs.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_14_2': [
    { id: 'doc_q_14_2_1', title: 'Verified Mentors List', description: 'Verified list of mentors actively engaged with startups under State/UT-facilitated mentorship schemes.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_14_2_2', title: 'MoU / Onboarding Docs', description: 'MoU, empanelment letters, or onboarding documentation for mentors.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_14_2_3', title: 'Mentor Engagement Reports', description: 'Session-wise mentor engagement reports or digital interaction proofs (e.g., Zoom logs, WhatsApp screenshots, event flyers).', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 10, maxFileSize: 10 }
  ],
  'q_14_3': [
    { id: 'doc_q_14_3_1', title: 'Ecosystem Enablers List', description: 'List of sensitization or capacity-building initiatives for ecosystem enablers (investors, mentors, incubators, academia, etc.)', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_14_4': [
    { id: 'doc_q_14_4_1', title: 'Participation Confirmation', description: 'Communication/email screenshots, attendance records, or official correspondence confirming participation in Startup India’s State Ranking Workshops.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_15_1': [
    { id: 'doc_q_15_1_1', title: 'Total IPRs Count', description: 'Total number of Intellectual Property Rights (IPRs) filed and granted by startups in the State/UT.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_15_1_2', title: 'GO / Policy Documents', description: 'Government orders, notifications, or policy documents regarding special provisions for fast-tracking IPRs.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_15_1_3', title: 'IPR Scheme Docs / Forms', description: 'IPR support scheme documents, application links/forms, awareness materials (if any).', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_15_2': [
    { id: 'doc_q_15_2_1', title: 'R&D Support Circulars', description: 'Circulars, or notifications showing any R&D support such as infrastructure, grants, or partnerships for startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_15_2_2', title: 'MoU / R&D Partnerships', description: 'MoU or partnership documents with R&D institutions, industry bodies, or innovation clusters.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_15_2_3', title: 'Events / Grants Photos', description: 'Photos/reports of events, grants disbursed, or R&D infrastructure inaugurated for startups.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_15_3': [
    { id: 'doc_q_15_3_1', title: 'Institutions List', description: 'List of educational/research institutions actively promoting R&D and innovation for startups.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_15_3_2', title: 'MoU / Engagement Letters', description: 'MoU/Letters from these institutions confirming engagement in startup R&D.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_15_3_3', title: 'Press / Annual Reports', description: 'Press coverage, annual reports, or summaries of R&D activities involving startups.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_16_1': [
    { id: 'doc_q_16_1_1', title: 'Green Startups List', description: 'List of startups supported by the State/UT that are working in green fields.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_16_1_2', title: 'Incentive Details', description: 'Details of the incentive provided for each Startup.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_16_1_3', title: 'Testimonials / Letters', description: 'Testimonials or acknowledgment letters from the supported startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_16_2': [
    { id: 'doc_q_16_2_1', title: 'Green Districts List', description: 'List of districts where such green/sustainability startups are present.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_16_2_2', title: 'Mapping / Dashboard', description: 'Any mapping, internal dashboard screenshot, or Excel-based tracker showing startup presence by district.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_17_1': [
    { id: 'doc_q_17_1_1', title: 'Scheme / GO', description: 'Scheme document / notification / order detailing the special incentives for social enterprises startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_17_1_2', title: 'Supported Startups List', description: 'List of Startups supported.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_17_1_3', title: 'Incentives Details', description: 'Details of incentive provided for each Startup.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_17_1_4', title: 'Districts List', description: 'List of districts with number of social enterprises startups.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_17_2': [
    { id: 'doc_q_17_2_1', title: 'Scheme / GO', description: 'Scheme document / notification / order detailing the special incentives for social enterprises startups.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_17_2_2', title: 'Supported Startups List', description: 'List of Startups supported.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_17_2_3', title: 'Incentives Details', description: 'Details of incentive provided for each Startup.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_17_2_4', title: 'Districts List', description: 'List of districts with number of social enterprises startups.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_18_1': [
    { id: 'doc_q_18_1_1', title: 'Job Portal URL', description: 'URL or access to the dedicated job portal, career page or employment platform integration.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_18_1_2', title: 'Official Launch Comm.', description: 'Official communication/order/notification launching or detailing the platform/mechanism.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_18_1_3', title: 'Screenshots / Samples', description: 'Screenshots or user interface samples of the platform.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_18_1_4', title: 'Job Listings Data', description: 'Data on job/internship/apprenticeship listings and applications received through the platform.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_18_1_5', title: 'ESI Registered Employees', description: 'Number of startup employees registered under the Employees’ State Insurance (ESI) scheme.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_18_1_6', title: 'Self-declared Jobs Data', description: 'Self-declared data from startups indicating number of direct jobs created, countersigned.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_18_1_7', title: 'Startups Supported List', description: 'List of startups supported by the State/UT along with the corresponding number of jobs created by each startup.', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 }
  ],
  'q_19_1': [
    { id: 'doc_q_19_1_1', title: 'Awards GO / Circular', description: 'Government order / scheme document / circular announcing startup awards, recognitions, or visibility platforms.', mandatory: true, acceptedFileTypes: ['.pdf'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_19_1_2', title: 'Visibility Evidence', description: 'Evidence of visibility/recognition initiatives - program brochures, event flyers, newspaper/magazine clippings, social media campaigns, press releases, or video content.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 10, maxFileSize: 10 },
    { id: 'doc_q_19_1_3', title: 'Recognized Startups List', description: 'List of startups recognized (including name, stage, and recognition received).', mandatory: true, acceptedFileTypes: ['.pdf', '.xlsx'], maxFiles: 5, maxFileSize: 10 },
    { id: 'doc_q_19_1_4', title: 'Digital Promotions Proof', description: 'Screenshots or links of digital promotions - newsletters, State Startup Portal pages or campaign-specific microsites.', mandatory: true, acceptedFileTypes: ['.pdf', '.jpg', '.png'], maxFiles: 5, maxFileSize: 10 }
  ]
};
