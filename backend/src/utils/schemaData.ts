export const SEED_SCHEMA = {
  areas: [
    {
      id: "area_1",
      title: "1. Institutional Support",
      description: "Focuses on state policies and institutional support for startups.",
      actionPoints: [
        {
          id: "ap_1_1",
          title: "1. Support Provided to Startups by State/UT Department(s)",
          questions: [
            {
              id: "q_1_1",
              questionNumber: "1.1",
              weightage: 1,
              title: "Does your State/UT have an active Startup Policy?",
              requiredDocuments: "Date of official implementation of the State/UT Startup Policy\nG.O. / Notification and Policy Document",
              guidelinesRef: "Page 10",
              scoringCriteria: "Yes: 1, No: 0",
              fields: [
                { id: "f_1_1_1", type: "Radio Button", label: "Does your State/UT have an active Startup Policy?", required: true, options: ["Yes", "No"] },
                { id: "f_1_1_2", type: "Date Picker", label: "Date of official implementation", required: true },
                { id: "f_1_1_3", type: "File Upload", label: "Upload G.O. / Notification", required: true }
              ]
            },
            {
              id: "q_1_2",
              questionNumber: "1.2",
              weightage: 1,
              title: "Have there been any amendments or renewals to the State/UT Startup Policy since its initial launch?",
              requiredDocuments: "G.O. / Notification for Policy Renewal or Amendment",
              guidelinesRef: "Page 10",
              scoringCriteria: "Yes: 1, No: 0",
              fields: [
                { id: "f_1_2_1", type: "Radio Button", label: "Any amendments or renewals?", required: true, options: ["Yes", "No"] },
                { id: "f_1_2_2", type: "File Upload", label: "Upload G.O. / Notification", required: false }
              ]
            },
            {
              id: "q_1_3",
              questionNumber: "1.3",
              weightage: 1,
              title: "Provide a structure of the current strength, roles and hierarchy of the nodal team responsible for startup-related initiatives.",
              requiredDocuments: "G.O. / Notification citing the Nodal Department\nDetailed documents showcasing team structure",
              guidelinesRef: "Page 10",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_1_3_1", type: "File Upload", label: "Upload G.O. citing Nodal Department", required: true },
                { id: "f_1_3_2", type: "File Upload", label: "Upload Team Structure Document", required: true },
                { id: "f_1_3_3", type: "Number Field", label: "Total number of schemes facilitating Startups", required: true }
              ]
            },
            {
              id: "q_1_4",
              questionNumber: "1.4",
              weightage: 1,
              title: "Have the State/UT department and other relevant departments allocated a budget for startups and related activities in the financial years 2024-25 and 2025-26?",
              requiredDocuments: "Budget Documents, G.O.s and Notifications related to Startup support",
              guidelinesRef: "Page 10",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_1_4_1", type: "Radio Button", label: "Budget allocated?", required: true, options: ["Yes", "No"] },
                { id: "f_1_4_2", type: "File Upload", label: "Upload Budget Documents", required: false }
              ]
            },
            {
              id: "q_1_5",
              questionNumber: "1.5",
              weightage: 2,
              title: "Details of institutional support for Startups by departments other than the Nodal department.",
              requiredDocuments: "List of Departments providing institutional support\nList and number of Startups that have availed incentives",
              guidelinesRef: "Page 10",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_1_5_1", type: "Textarea", label: "List of Departments providing support", required: true },
                { id: "f_1_5_2", type: "Number Field", label: "Number of Startups getting institutional support", required: true },
                { id: "f_1_5_3", type: "File Upload", label: "Upload Details of support provided under each scheme", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_1_2",
          title: "2. For development with a progressive and innovative focus",
          questions: [
            {
              id: "q_2_1",
              questionNumber: "2.1",
              weightage: 1,
              title: "How many Priority Sectors have been identified in your State/Union Territory?",
              requiredDocuments: "List of identified Priority Sectors",
              guidelinesRef: "Page 12",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_2_1_1", type: "Number Field", label: "Number of Priority Sectors", required: true },
                { id: "f_2_1_2", type: "Textarea", label: "List of identified Priority Sectors", required: true }
              ]
            },
            {
              id: "q_2_2",
              questionNumber: "2.2",
              weightage: 2,
              title: "a. How many initiatives have been launched to develop Priority Sectors? b. How many Startups are supported?",
              requiredDocuments: "Details of schemes / policies / initiatives",
              guidelinesRef: "Page 12",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_2_2_1", type: "Number Field", label: "Number of initiatives launched", required: true },
                { id: "f_2_2_2", type: "Number Field", label: "Number of Startups supported", required: true },
                { id: "f_2_2_3", type: "File Upload", label: "Upload Scheme documents", required: true }
              ]
            },
            {
              id: "q_2_3",
              questionNumber: "2.3",
              weightage: 2,
              title: "How many Deep Tech and AI-focused initiatives have been undertaken by the State/UT?",
              requiredDocuments: "Scheme documents, G.O. or circulars detailing the Deep Tech initiatives",
              guidelinesRef: "Page 12",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_2_3_1", type: "Number Field", label: "Number of Deep Tech/AI initiatives", required: true },
                { id: "f_2_3_2", type: "File Upload", label: "Upload relevant documents", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_1_3",
          title: "3. Facilitation of grassroot innovation and support to women & young entrepreneurs",
          questions: [
            {
              id: "q_3_1",
              questionNumber: "3.1",
              weightage: 1,
              title: "How many startups from Tier 2, Tier 3 and Tier 4 districts have been identified and supported?",
              requiredDocuments: "Details of categorization of Tier districts",
              guidelinesRef: "Page 14",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_3_1_1", type: "Number Field", label: "Number of startups from Tier 2/3/4 districts", required: true },
                { id: "f_3_1_2", type: "File Upload", label: "Upload proof of support", required: true }
              ]
            },
            {
              id: "q_3_2",
              questionNumber: "3.2",
              weightage: 2,
              title: "Number of initiatives undertaken by the State/UT to promote startup ecosystem in Aspirational Districts?",
              requiredDocuments: "List of aspirational districts in your State/UT",
              guidelinesRef: "Page 14",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_3_2_1", type: "Number Field", label: "Number of initiatives in Aspirational Districts", required: true },
                { id: "f_3_2_2", type: "File Upload", label: "Upload event reports/agendas", required: true }
              ]
            },
            {
              id: "q_3_3",
              questionNumber: "3.3",
              weightage: 2,
              title: "a. Number of women-led startups in the State/UT. b. Number of initiatives for women-led startups.",
              requiredDocuments: "List the special incentives provided to women-led Startups",
              guidelinesRef: "Page 14",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_3_3_1", type: "Number Field", label: "Total number of women-led startups", required: true },
                { id: "f_3_3_2", type: "Number Field", label: "Number of initiatives for women entrepreneurs", required: true },
                { id: "f_3_3_3", type: "File Upload", label: "Upload policy/scheme documents", required: true }
              ]
            },
            {
              id: "q_3_4",
              questionNumber: "3.4",
              weightage: 2,
              title: "Number of initiatives undertaken to promote startup ecosystem awareness among students in schools and colleges.",
              requiredDocuments: "Government orders, circulars, or scheme documents",
              guidelinesRef: "Page 14",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_3_4_1", type: "Number Field", label: "Number of initiatives in schools & colleges", required: true },
                { id: "f_3_4_2", type: "File Upload", label: "Upload event reports/attendance sheets", required: true }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "area_2",
      title: "2. Infrastructure Support",
      description: "Support for incubation, acceleration, and digital infrastructure.",
      actionPoints: [
        {
          id: "ap_2_4",
          title: "4. Incubation and Acceleration support",
          questions: [
            {
              id: "q_4_1",
              questionNumber: "4.1",
              weightage: 2,
              title: "How many manufacturing and non-manufacturing incubators have been established/upgraded?",
              requiredDocuments: "List of incubators along with locations and status",
              guidelinesRef: "Page 18",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_4_1_1", type: "Number Field", label: "Number of manufacturing and non-manufacturing incubators", required: true },
                { id: "f_4_1_2", type: "File Upload", label: "Upload Government Orders/Sanction Letters", required: true }
              ]
            },
            {
              id: "q_4_2",
              questionNumber: "4.2",
              weightage: 2,
              title: "Number of incubators and accelerators supported by the State/UT through capacity development initiatives?",
              requiredDocuments: "List of supported incubators and accelerators",
              guidelinesRef: "Page 18",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_4_2_1", type: "Number Field", label: "Number of incubators/accelerators supported", required: true },
                { id: "f_4_2_2", type: "File Upload", label: "Upload fund disbursement proofs", required: true }
              ]
            },
            {
              id: "q_4_3",
              questionNumber: "4.3",
              weightage: 2,
              title: "a. Number of initiatives to strengthen Deep Tech capabilities within incubators? b. Number of startups benefited.",
              requiredDocuments: "Details of Deep Tech initiatives within incubators",
              guidelinesRef: "Page 18",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_4_3_1", type: "Number Field", label: "Number of Deep Tech initiatives", required: true },
                { id: "f_4_3_2", type: "Number Field", label: "Number of startups benefited", required: true },
                { id: "f_4_3_3", type: "File Upload", label: "Upload project reports/scheme documents", required: true }
              ]
            },
            {
              id: "q_4_4",
              questionNumber: "4.4",
              weightage: 1,
              title: "Number of capacity development initiatives to set up incubators and accelerators in Tier 2, 3 and 4 cities?",
              requiredDocuments: "List of initiatives for Tier 2/3/4 cities",
              guidelinesRef: "Page 18",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_4_4_1", type: "Number Field", label: "Number of initiatives in Tier 2, 3, 4 cities", required: true },
                { id: "f_4_4_2", type: "File Upload", label: "Upload MoU/sanction letters", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_2_5",
          title: "5. Infrastructure support in Tier 2, Tier 3 and Tier 4 regions",
          questions: [
            {
              id: "q_5_1",
              questionNumber: "5.1",
              weightage: 2,
              title: "How many dedicated initiatives/programs have been undertaken to develop infrastructure for startups in Tier 2/3/4 regions?",
              requiredDocuments: "List of infrastructure initiatives",
              guidelinesRef: "Page 19",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_5_1_1", type: "Number Field", label: "Number of infrastructure initiatives", required: true },
                { id: "f_5_1_2", type: "File Upload", label: "Upload Government Orders/Photos", required: true }
              ]
            },
            {
              id: "q_5_2",
              questionNumber: "5.2",
              weightage: 2,
              title: "Number of districts covered in Tier 2, Tier 3, and Tier 4 regions by initiatives to develop infrastructure.",
              requiredDocuments: "District-wise mapping of Tier 2, 3, 4 regions",
              guidelinesRef: "Page 19",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_5_2_1", type: "Number Field", label: "Number of districts covered", required: true },
                { id: "f_5_2_2", type: "File Upload", label: "Upload GIS maps or summary tables", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_2_6",
          title: "6. Access to Digital Infrastructure",
          questions: [
            {
              id: "q_6_1",
              questionNumber: "6.1",
              weightage: 1,
              title: "How many ecosystem stakeholders are registered on the State/UT Startup Portal?",
              requiredDocuments: "List of ecosystem stakeholders registered",
              guidelinesRef: "Page 20",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_6_1_1", type: "Number Field", label: "Number of ecosystem stakeholders registered", required: true },
                { id: "f_6_1_2", type: "File Upload", label: "Upload backend user analytics data", required: true }
              ]
            },
            {
              id: "q_6_2",
              questionNumber: "6.2",
              weightage: 3,
              title: "Are the following criteria satisfied: digital application, grievance portal, local language, PwD accessibility, internal dashboard?",
              requiredDocuments: "Screenshots or URLs showing the features",
              guidelinesRef: "Page 20",
              scoringCriteria: "Max Score: 3 (0.6 per sub-point)",
              fields: [
                { id: "f_6_2_1", type: "Checkbox", label: "Has digital application process?", required: true },
                { id: "f_6_2_2", type: "Checkbox", label: "Has Grievance Redressal Mechanism?", required: true },
                { id: "f_6_2_3", type: "Checkbox", label: "Available in local/official language?", required: true },
                { id: "f_6_2_4", type: "Checkbox", label: "Accessible to Persons with Disabilities (PwD)?", required: true },
                { id: "f_6_2_5", type: "Checkbox", label: "Has internal dashboard/tracking mechanism?", required: true },
                { id: "f_6_2_6", type: "File Upload", label: "Upload Screenshots/URLs", required: true }
              ]
            },
            {
              id: "q_6_3",
              questionNumber: "6.3",
              weightage: 1,
              title: "Does the State/UT have specific initiatives to promote BHASKAR & DPIIT startup recognition process?",
              requiredDocuments: "Circulars, notifications, or communication related to BHASKAR",
              guidelinesRef: "Page 20",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_6_3_1", type: "Radio Button", label: "Initiatives to promote BHASKAR & DPIIT recognition?", required: true, options: ["Yes", "No"] },
                { id: "f_6_3_2", type: "File Upload", label: "Upload Circulars/Notifications", required: false }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "area_3",
      title: "3. Funding Opportunities",
      description: "Ease of access to funding and state supported funds.",
      actionPoints: [
        {
          id: "ap_3_7",
          title: "7. Ease of access to funding",
          questions: [
            {
              id: "q_7_1",
              questionNumber: "7.1",
              weightage: 3,
              title: "Does the State/UT have mechanisms like Seed Fund/Venture Fund, sector-wise allocation, or special funding with banks?",
              requiredDocuments: "List of funds, Sanction letters, Proof of release",
              guidelinesRef: "Page 22",
              scoringCriteria: "Max Score: 3",
              fields: [
                { id: "f_7_1_1", type: "Checkbox", label: "Seed Fund, Venture Fund, or FoF established?", required: true },
                { id: "f_7_1_2", type: "Checkbox", label: "Allocation with priority sector breakdown?", required: true },
                { id: "f_7_1_3", type: "Checkbox", label: "Special funding provisions with banks?", required: true },
                { id: "f_7_1_4", type: "File Upload", label: "Upload proof of release of funds", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_3_8",
          title: "8. Funding through state supported funds or mechanisms",
          questions: [
            {
              id: "q_8_1",
              questionNumber: "8.1",
              weightage: 2,
              title: "How many startups have received funding through State-supported funds?",
              requiredDocuments: "Sanction letters or GO, List of Startups funded",
              guidelinesRef: "Page 23",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_8_1_1", type: "Number Field", label: "Number of startups received funding", required: true },
                { id: "f_8_1_2", type: "Number Field", label: "Total amount of funds disbursed (INR)", required: true },
                { id: "f_8_1_3", type: "File Upload", label: "Upload Sanction letters and List", required: true }
              ]
            },
            {
              id: "q_8_2",
              questionNumber: "8.2",
              weightage: 2,
              title: "a. Percentage of funds disbursed. b. Average time taken to disburse funds.",
              requiredDocuments: "Scheme-wise summary reports, Bank statements",
              guidelinesRef: "Page 23",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_8_2_1", type: "Number Field", label: "Percentage of funds disbursed (%)", required: true },
                { id: "f_8_2_2", type: "Number Field", label: "Average time taken to disburse (Months)", required: true },
                { id: "f_8_2_3", type: "File Upload", label: "Upload Bank Statements/Disbursement Proofs", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_3_9",
          title: "9. Support in fundraising initiatives",
          questions: [
            {
              id: "q_9_1",
              questionNumber: "9.1",
              weightage: 2,
              title: "How many programs or events with pitching sessions have been conducted to promote Investor Engagement and Startup Participation?",
              requiredDocuments: "List of Events/programs, Proof of MoU(s)",
              guidelinesRef: "Page 25",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_9_1_1", type: "Number Field", label: "Number of Engagements with Investors", required: true },
                { id: "f_9_1_2", type: "Number Field", label: "Number of startups that participated", required: true },
                { id: "f_9_1_3", type: "File Upload", label: "Upload Event Reports", required: true }
              ]
            },
            {
              id: "q_9_2",
              questionNumber: "9.2",
              weightage: 2,
              title: "How many successful connections have been facilitated between startups and investors?",
              requiredDocuments: "List mapping successful connections, Press releases",
              guidelinesRef: "Page 25",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_9_2_1", type: "Number Field", label: "Number of successful connections established", required: true },
                { id: "f_9_2_2", type: "File Upload", label: "Upload Testimonials/Feedback Forms", required: true }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "area_4",
      title: "4. Market Access & Reach",
      description: "Market access opportunities through Public Procurement and partnerships.",
      actionPoints: [
        {
          id: "ap_4_10",
          title: "10. Market access opportunity provided to startups through Public Procurement",
          questions: [
            {
              id: "q_10_1",
              questionNumber: "10.1",
              weightage: 2,
              title: "Number of tenders/RFPs floated by the State/UTs/PSUs that allowed the participation of Startups through relaxations.",
              requiredDocuments: "List of RFPs/tender documents, Links of where published",
              guidelinesRef: "Page 28",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_10_1_1", type: "Number Field", label: "Number of Tenders/RFPs floated", required: true },
                { id: "f_10_1_2", type: "File Upload", label: "Upload List of RFPs", required: true }
              ]
            },
            {
              id: "q_10_2",
              questionNumber: "10.2",
              weightage: 2,
              title: "Number of startups awarded work orders/purchase orders in Aspirational Districts.",
              requiredDocuments: "List of Aspirational Districts, Amount of Work Order awarded",
              guidelinesRef: "Page 28",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_10_2_1", type: "Number Field", label: "Number of Startups awarded work orders", required: true },
                { id: "f_10_2_2", type: "Number Field", label: "Number of Aspirational Districts covered", required: true },
                { id: "f_10_2_3", type: "File Upload", label: "Upload POs/WOs issued", required: true }
              ]
            },
            {
              id: "q_10_3",
              questionNumber: "10.3",
              weightage: 1,
              title: "How many market access opportunities have been facilitated for startups in priority sectors?",
              requiredDocuments: "Media coverage, Copies of tender documents in priority sectors",
              guidelinesRef: "Page 28",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_10_3_1", type: "Number Field", label: "Number of market access opportunities", required: true },
                { id: "f_10_3_2", type: "File Upload", label: "Upload tender docs/sanction letters", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_4_11",
          title: "11. Access to Domestic and International Market Opportunities and Partnerships",
          questions: [
            {
              id: "q_11_1",
              questionNumber: "11.1",
              weightage: 2,
              title: "a. Number of initiatives for domestic market linkages/PPPs. b. Number of startups benefited.",
              requiredDocuments: "Details of PPP initiatives, MoU signed",
              guidelinesRef: "Page 30",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_11_1_1", type: "Number Field", label: "Number of domestic initiatives/PPPs implemented", required: true },
                { id: "f_11_1_2", type: "Number Field", label: "Number of startups that benefited", required: true },
                { id: "f_11_1_3", type: "File Upload", label: "Upload Evidence of implementation", required: true }
              ]
            },
            {
              id: "q_11_2",
              questionNumber: "11.2",
              weightage: 2,
              title: "a. Number of initiatives with global stakeholders. b. Number of startups benefited.",
              requiredDocuments: "Copies of signed MoUs with global stakeholders, Event reports",
              guidelinesRef: "Page 30",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_11_2_1", type: "Number Field", label: "Number of international initiatives", required: true },
                { id: "f_11_2_2", type: "Number Field", label: "Number of startups that benefited", required: true },
                { id: "f_11_2_3", type: "File Upload", label: "Upload MoUs with global stakeholders", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_4_12",
          title: "12. Facilitating Ease of Doing Business for Startups through Trusted Partner mechanisms",
          questions: [
            {
              id: "q_12_1",
              questionNumber: "12.1",
              weightage: 1,
              title: "Has the State/UT undertaken any initiatives aligned with a 'Trusted Partner' approach (green channel)?",
              requiredDocuments: "Government Order / Notification for Trusted Partner approach",
              guidelinesRef: "Page 32",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_12_1_1", type: "Radio Button", label: "Initiated Trusted Partner / Green Channel?", required: true, options: ["Yes", "No"] },
                { id: "f_12_1_2", type: "File Upload", label: "Upload Notification / Circular", required: false }
              ]
            },
            {
              id: "q_12_2",
              questionNumber: "12.2",
              weightage: 1,
              title: "What is the average time taken to process key approvals vs standard processing time?",
              requiredDocuments: "Reports showing actual processing time, Comparative analysis",
              guidelinesRef: "Page 32",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_12_2_1", type: "Number Field", label: "Average time for recognized startups (Days)", required: true },
                { id: "f_12_2_2", type: "Number Field", label: "Average time for other entities (Days)", required: true },
                { id: "f_12_2_3", type: "File Upload", label: "Upload Comparative Analysis Report", required: true }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "area_5",
      title: "5. Ecosystem Capacity Building",
      description: "Capacity Building of State/UT Government Departments.",
      actionPoints: [
        {
          id: "ap_5_13",
          title: "13. Capacity Building of State/UT Government Departments",
          questions: [
            {
              id: "q_13_1",
              questionNumber: "13.1",
              weightage: 1,
              title: "Number of sensitization workshops/programs conducted for Startup Nodal Agency and departments?",
              requiredDocuments: "List of sensitization workshops, Event reports",
              guidelinesRef: "Page 35",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_13_1_1", type: "Number Field", label: "Number of sensitization workshops conducted", required: true },
                { id: "f_13_1_2", type: "File Upload", label: "Upload Attendance sheets/photos", required: true }
              ]
            },
            {
              id: "q_13_2",
              questionNumber: "13.2",
              weightage: 1,
              title: "Number of capacity building programs focused on Tier 2, Tier 3 and Tier 4 districts.",
              requiredDocuments: "List of capacity-building programs in Tier 2/3/4 districts",
              guidelinesRef: "Page 35",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_13_2_1", type: "Number Field", label: "Number of capacity building programs in Tier 2/3/4", required: true },
                { id: "f_13_2_2", type: "File Upload", label: "Upload program brochures/agendas", required: true }
              ]
            },
            {
              id: "q_13_3",
              questionNumber: "13.3",
              weightage: 1,
              title: "Total number of government officials trained through these capacity building initiatives.",
              requiredDocuments: "Cumulative list of government officials trained",
              guidelinesRef: "Page 35",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_13_3_1", type: "Number Field", label: "Total number of government officials trained", required: true },
                { id: "f_13_3_2", type: "File Upload", label: "Upload Attendance records", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_5_14",
          title: "14. State/UT-supported initiatives to sensitize ecosystem enablers",
          questions: [
            {
              id: "q_14_1",
              questionNumber: "14.1",
              weightage: 2,
              title: "Number of capacity development initiatives conducted to sensitize startups in the State/UT.",
              requiredDocuments: "Calendar/schedule of capacity development sessions",
              guidelinesRef: "Page 37",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_14_1_1", type: "Number Field", label: "Number of initiatives conducted to sensitize startups", required: true },
                { id: "f_14_1_2", type: "File Upload", label: "Upload Training materials/photos", required: true }
              ]
            },
            {
              id: "q_14_2",
              questionNumber: "14.2",
              weightage: 1,
              title: "Number of mentors who provide mentorship support to startups, facilitated by the State/UT.",
              requiredDocuments: "Verified list of mentors, MoU/empanelment letters",
              guidelinesRef: "Page 37",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_14_2_1", type: "Number Field", label: "Number of mentors providing support", required: true },
                { id: "f_14_2_2", type: "File Upload", label: "Upload List of mentors and MoUs", required: true }
              ]
            },
            {
              id: "q_14_3",
              questionNumber: "14.3",
              weightage: 1,
              title: "Number of capacity development programs conducted to sensitize other ecosystem enablers.",
              requiredDocuments: "List of sensitization initiatives for ecosystem enablers",
              guidelinesRef: "Page 37",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_14_3_1", type: "Number Field", label: "Number of initiatives for other ecosystem enablers", required: true },
                { id: "f_14_3_2", type: "File Upload", label: "Upload Session date, theme, and outcome reports", required: true }
              ]
            },
            {
              id: "q_14_4",
              questionNumber: "14.4",
              weightage: 1,
              title: "Has the State/UT participated in any State’s Startup Ranking Workshops conducted by Startup India?",
              requiredDocuments: "Communication/email screenshots confirming participation",
              guidelinesRef: "Page 37",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_14_4_1", type: "Radio Button", label: "Participated in Startup India Workshops?", required: true, options: ["Yes", "No"] },
                { id: "f_14_4_2", type: "File Upload", label: "Upload Official correspondence", required: false }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "area_6",
      title: "6. Focus on Innovation and Sustainability",
      description: "Support for Green Growth, R&D, and Social Innovation.",
      actionPoints: [
        {
          id: "ap_6_15",
          title: "15. Initiatives undertaken by the State/UT to facilitate research and innovation",
          questions: [
            {
              id: "q_15_1",
              questionNumber: "15.1",
              weightage: 1,
              title: "Has the State/ UT initiated special provisions for fast-tracking Intellectual Property Rights (IPR)?",
              requiredDocuments: "Total number of IPRs filed and granted, Government orders",
              guidelinesRef: "Page 40",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_15_1_1", type: "Radio Button", label: "Special provisions for IPR?", required: true, options: ["Yes", "No"] },
                { id: "f_15_1_2", type: "Number Field", label: "Total number of IPRs filed and granted", required: false },
                { id: "f_15_1_3", type: "File Upload", label: "Upload IPR support scheme documents", required: false }
              ]
            },
            {
              id: "q_15_2",
              questionNumber: "15.2",
              weightage: 1,
              title: "Is the State/UT providing any R&D support to foster innovation among startups?",
              requiredDocuments: "Circulars/notifications showing R&D support, MoU documents",
              guidelinesRef: "Page 40",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_15_2_1", type: "Radio Button", label: "Providing R&D support?", required: true, options: ["Yes", "No"] },
                { id: "f_15_2_2", type: "File Upload", label: "Upload Photos/reports of R&D infrastructure", required: false }
              ]
            },
            {
              id: "q_15_3",
              questionNumber: "15.3",
              weightage: 2,
              title: "How many active educational or research institutions are engaged in promoting R&D innovation for startups?",
              requiredDocuments: "List of educational/research institutions, MoU/Letters",
              guidelinesRef: "Page 40",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_15_3_1", type: "Number Field", label: "Number of educational/research institutions engaged", required: true },
                { id: "f_15_3_2", type: "File Upload", label: "Upload MoU/Letters confirming engagement", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_6_16",
          title: "16. Support for Startups in Green Growth and Sustainability",
          questions: [
            {
              id: "q_16_1",
              questionNumber: "16.1",
              weightage: 1,
              title: "Number of Startups supported focused on renewable energy, eco-friendly practices, clean tech.",
              requiredDocuments: "List of startups supported, Details of incentives",
              guidelinesRef: "Page 41",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_16_1_1", type: "Number Field", label: "Number of Startups supported in Green Growth", required: true },
                { id: "f_16_1_2", type: "File Upload", label: "Upload List of startups", required: true }
              ]
            },
            {
              id: "q_16_2",
              questionNumber: "16.2",
              weightage: 1,
              title: "Number of districts that have startups present in the above areas.",
              requiredDocuments: "List of districts, Internal dashboard screenshot",
              guidelinesRef: "Page 41",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_16_2_1", type: "Number Field", label: "Number of districts that have startups in Green Growth", required: true },
                { id: "f_16_2_2", type: "File Upload", label: "Upload District Mapping / Screenshots", required: true }
              ]
            }
          ]
        },
        {
          id: "ap_6_17",
          title: "17. Entrepreneurial growth in the social innovation landscape",
          questions: [
            {
              id: "q_17_1",
              questionNumber: "17.1",
              weightage: 1,
              title: "Are there any initiatives provided to support Startups in the social enterprises sphere?",
              requiredDocuments: "Scheme document detailing special incentives",
              guidelinesRef: "Page 43",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_17_1_1", type: "Radio Button", label: "Initiatives for social enterprises?", required: true, options: ["Yes", "No"] },
                { id: "f_17_1_2", type: "File Upload", label: "Upload Scheme Document", required: false }
              ]
            },
            {
              id: "q_17_2",
              questionNumber: "17.2",
              weightage: 2,
              title: "a. How many Startups supported? b. Number of districts they are working in.",
              requiredDocuments: "List of Startups, List of districts",
              guidelinesRef: "Page 43",
              scoringCriteria: "Max Score: 2",
              fields: [
                { id: "f_17_2_1", type: "Number Field", label: "Number of social enterprise Startups supported", required: true },
                { id: "f_17_2_2", type: "Number Field", label: "Number of districts with social enterprise startups", required: true },
                { id: "f_17_2_3", type: "File Upload", label: "Upload List of startups and districts", required: true }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "area_7",
      title: "7. Impact and Recognition",
      description: "Job creation and ecosystem recognition.",
      actionPoints: [
        {
          id: "ap_7_18",
          title: "18. Job opportunities created by startups",
          questions: [
            {
              id: "q_18_1",
              questionNumber: "18.1",
              weightage: 1,
              title: "Does the State/UT have a dedicated platform/mechanism (job portal) to facilitate job/internship opportunities?",
              requiredDocuments: "URL to job portal, Official communication, Data on listings",
              guidelinesRef: "Page 45",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_18_1_1", type: "Radio Button", label: "Has dedicated job portal / mechanism?", required: true, options: ["Yes", "No"] },
                { id: "f_18_1_2", type: "URL Field", label: "URL to the dedicated job portal", required: false },
                { id: "f_18_1_3", type: "Number Field", label: "Number of startup employees registered (e.g. ESI)", required: false },
                { id: "f_18_1_4", type: "File Upload", label: "Upload Self-declared data/screenshots", required: false }
              ]
            }
          ]
        },
        {
          id: "ap_7_19",
          title: "19. Recognition of the startup ecosystem",
          questions: [
            {
              id: "q_19_1",
              questionNumber: "19.1",
              weightage: 1,
              title: "Number of startups supported that have received accolades/awards in national/international forums.",
              requiredDocuments: "Government order/circular, Evidence of visibility, List of startups recognized",
              guidelinesRef: "Page 46",
              scoringCriteria: "Max Score: 1",
              fields: [
                { id: "f_19_1_1", type: "Number Field", label: "Number of startups supported that received accolades", required: true },
                { id: "f_19_1_2", type: "File Upload", label: "Upload Evidence of visibility/awards", required: true },
                { id: "f_19_1_3", type: "File Upload", label: "Upload List of startups recognized", required: true }
              ]
            }
          ]
        }
      ]
    }
  ]
};


