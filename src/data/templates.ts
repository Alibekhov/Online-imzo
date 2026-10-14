import { EnvelopeDocument, DocumentField, Recipient } from '../types';

export interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedMinutes: number;
  document: EnvelopeDocument;
  defaultRecipients: Omit<Recipient, 'id' | 'status'>[];
  defaultFields: (recipientIds: string[]) => DocumentField[];
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'template_nda',
    name: 'Mutual Non-Disclosure Agreement',
    category: 'Legal & Corporate',
    description: 'Standard two-way confidential disclosure agreement for corporate partnerships, mergers, or contractor evaluations.',
    estimatedMinutes: 3,
    document: {
      id: 'doc_nda_01',
      title: 'Mutual Non-Disclosure Agreement',
      pages: [
        {
          pageNumber: 1,
          title: 'MUTUAL NON-DISCLOSURE AGREEMENT',
          paragraphs: [
            'This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of the date of execution by and between the Disclosing Party and the Receiving Party (collectively, the "Parties").',
            '1. PURPOSE & SCOPE. The Parties wish to explore a mutually beneficial business relationship concerning software engineering, intellectual property cooperation, and strategic data sharing (the "Purpose"). In connection with the Purpose, each Party may disclose to the other certain proprietary and non-public information.',
            '2. DEFINITION OF CONFIDENTIAL INFORMATION. "Confidential Information" means all non-public information disclosed by one Party ("Disclosing Party") to the other Party ("Receiving Party"), whether orally or in writing, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.',
            '3. EXCLUSIONS. Confidential Information does not include information that: (a) is or becomes publicly available without breach of this Agreement; (b) was known to Receiving Party prior to its disclosure without breach of any confidentiality obligation; or (c) is independently developed by Receiving Party without reference to or use of Disclosing Party’s Confidential Information.',
            '4. OBLIGATIONS OF RECEIVING PARTY. The Receiving Party agrees to: (a) protect the Confidential Information with at least the same degree of care it uses to protect its own sensitive data, but not less than reasonable care; (b) limit disclosure solely to officers, employees, and legal counsel with a legitimate need to know; and (c) not reverse-engineer or decompile any sample code or hardware provided.'
          ],
          footerText: 'Page 1 of 2 — Confidential & Proprietary'
        },
        {
          pageNumber: 2,
          title: 'EXECUTION & BINDING SIGNATURES',
          paragraphs: [
            '5. TERM & TERMINATION. The confidentiality obligations under this Agreement shall survive for a period of three (3) years from the date of final signature, except for trade secrets, which shall remain protected in perpetuity under applicable uniform trade secrets legislation.',
            '6. GOVERNING LAW & JURISDICTION. This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without giving effect to any principles of conflict of laws.',
            '7. COUNTERPARTS & ELECTRONIC SIGNATURES. This Agreement may be executed in counterparts, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument. Signatures transmitted electronically shall be deemed valid and binding as original wet signatures pursuant to the Federal Electronic Signatures in Global and National Commerce Act (ESIGN) and UETA.',
            'IN WITNESS WHEREOF, the Parties have caused this Mutual Non-Disclosure Agreement to be executed by their duly authorized representatives:'
          ],
          footerText: 'Page 2 of 2 — Execution Block'
        }
      ]
    },
    defaultRecipients: [
      {
        name: 'You (Sender)',
        email: 'sender@signpulse.io',
        role: 'signer',
        order: 1,
        color: '#2563EB',
      },
      {
        name: 'Counterparty Signer',
        email: 'partner@enterprise.org',
        role: 'signer',
        order: 2,
        color: '#7C3AED',
      }
    ],
    defaultFields: (recipientIds: string[]) => [
      // Page 2 signatures: Sender (Left)
      {
        id: 'f_sig_sender',
        type: 'signature',
        pageNumber: 2,
        x: 8,
        y: 62,
        width: 38,
        height: 10,
        recipientId: recipientIds[0],
        required: true,
        label: 'Sender Signature'
      },
      {
        id: 'f_name_sender',
        type: 'name',
        pageNumber: 2,
        x: 8,
        y: 74,
        width: 38,
        height: 6,
        recipientId: recipientIds[0],
        required: true,
        label: 'Printed Name'
      },
      {
        id: 'f_date_sender',
        type: 'date',
        pageNumber: 2,
        x: 8,
        y: 82,
        width: 38,
        height: 6,
        recipientId: recipientIds[0],
        required: true,
        label: 'Date Signed'
      },
      // Page 2 signatures: Counterparty (Right)
      {
        id: 'f_sig_recip',
        type: 'signature',
        pageNumber: 2,
        x: 54,
        y: 62,
        width: 38,
        height: 10,
        recipientId: recipientIds[1] || recipientIds[0],
        required: true,
        label: 'Authorized Counterparty Signature'
      },
      {
        id: 'f_name_recip',
        type: 'name',
        pageNumber: 2,
        x: 54,
        y: 74,
        width: 38,
        height: 6,
        recipientId: recipientIds[1] || recipientIds[0],
        required: true,
        label: 'Printed Name & Title'
      },
      {
        id: 'f_date_recip',
        type: 'date',
        pageNumber: 2,
        x: 54,
        y: 82,
        width: 38,
        height: 6,
        recipientId: recipientIds[1] || recipientIds[0],
        required: true,
        label: 'Date Signed'
      }
    ]
  },
  {
    id: 'template_offer',
    name: 'Full-Time Employment Offer Letter',
    category: 'Human Resources',
    description: 'Comprehensive employment agreement covering compensation, equity grant schedule, benefits, and confidential IP assignment.',
    estimatedMinutes: 2,
    document: {
      id: 'doc_offer_01',
      title: 'Offer of Employment & Compensation Terms',
      pages: [
        {
          pageNumber: 1,
          title: 'OFFER OF EMPLOYMENT',
          paragraphs: [
            'Dear Candidate,',
            'We are thrilled to extend an offer of full-time employment for the position of Senior Principal Engineer with our engineering organization. We were deeply impressed by your background, technical leadership, and alignment with our mission.',
            '1. POSITION & REPORTING. In this exempt role, you will report directly to the Vice President of Technology. Your primary responsibilities will include system architecture, core infrastructure reliability, and mentoring distributed software teams.',
            '2. COMPENSATION. Your starting annual base salary will be $185,000 USD, payable semi-monthly in accordance with standard corporate payroll practices, subject to normal statutory tax withholdings.',
            '3. INCENTIVE EQUITY. Subject to approval by the Board of Directors, you will be granted an option to purchase 25,000 Incentive Stock Units under our 2026 Equity Incentive Plan, vesting over 48 months with a standard one-year cliff.',
            '4. BENEFITS & TIME OFF. You will be eligible for 100% employer-sponsored health, dental, and vision insurance for you and your dependents, 401(k) retirement matching up to 4%, and unlimited flexible paid time off (FTO).'
          ],
          footerText: 'Page 1 of 2 — SignPulse HR System'
        },
        {
          pageNumber: 2,
          title: 'ACCEPTANCE & ACKNOWLEDGMENT',
          paragraphs: [
            '5. EMPLOYMENT AT-WILL. Employment with the Company is for an indefinite term and is terminable at-will by either you or the Company at any time, with or without cause and with or without advance notice.',
            '6. CONDITIONS OF EMPLOYMENT. This offer is contingent upon successful verification of identity, right to work under federal law, and signing of our standard Proprietary Information and Inventions Agreement.',
            'To accept this offer, please electronically sign and date below before the offer expiration deadline.',
            'We are enthusiastic about the prospect of working with you and building transformative technology together.'
          ],
          footerText: 'Page 2 of 2 — Acceptance Page'
        }
      ]
    },
    defaultRecipients: [
      {
        name: 'Jordan Vance (HR Director)',
        email: 'jordan.vance@company.com',
        role: 'signer',
        order: 1,
        color: '#059669',
      },
      {
        name: 'Employee Candidate',
        email: 'candidate@futureteam.org',
        role: 'signer',
        order: 2,
        color: '#D97706',
      }
    ],
    defaultFields: (recipientIds: string[]) => [
      {
        id: 'f_offer_hr_sig',
        type: 'signature',
        pageNumber: 2,
        x: 8,
        y: 60,
        width: 38,
        height: 10,
        recipientId: recipientIds[0],
        required: true,
        label: 'Hiring Official Signature'
      },
      {
        id: 'f_offer_hr_date',
        type: 'date',
        pageNumber: 2,
        x: 8,
        y: 72,
        width: 38,
        height: 6,
        recipientId: recipientIds[0],
        required: true,
        label: 'Date'
      },
      {
        id: 'f_offer_cand_sig',
        type: 'signature',
        pageNumber: 2,
        x: 54,
        y: 60,
        width: 38,
        height: 10,
        recipientId: recipientIds[1] || recipientIds[0],
        required: true,
        label: 'Candidate Signature (Acceptance)'
      },
      {
        id: 'f_offer_cand_date',
        type: 'date',
        pageNumber: 2,
        x: 54,
        y: 72,
        width: 38,
        height: 6,
        recipientId: recipientIds[1] || recipientIds[0],
        required: true,
        label: 'Accepted Date'
      }
    ]
  },
  {
    id: 'template_msa',
    name: 'Master Consulting Services Agreement',
    category: 'Commercial Contracts',
    description: 'Statement of work framework, deliverables milestones, payment installments, and intellectual property warranty.',
    estimatedMinutes: 4,
    document: {
      id: 'doc_msa_01',
      title: 'Master Consulting Services Agreement',
      pages: [
        {
          pageNumber: 1,
          title: 'MASTER CONSULTING SERVICES AGREEMENT',
          paragraphs: [
            'This Master Services Agreement ("Agreement") is made effective between Client and Contractor for the provision of professional engineering and architectural design consulting.',
            '1. SERVICES & STATEMENTS OF WORK. Contractor shall perform specialized technical consulting services described in one or more Statements of Work ("SOW") executed by both parties. Each SOW shall detail schedule, milestones, specifications, and fees.',
            '2. INDEPENDENT CONTRACTOR STATUS. Contractor is an independent contractor, and nothing herein shall be construed to create an employer-employee relationship, partnership, or joint venture.',
            '3. INVOICING & PAYMENT. Invoices shall be rendered upon completion of designated project milestones. Client agrees to remit net thirty (30) days from invoice receipt date via ACH or wire transfer.',
            '4. INTELLECTUAL PROPERTY & WORK FOR HIRE. All custom source code, documentation, architectural diagrams, and inventions authored solely for Client shall be deemed "Work Made for Hire" with all right, title, and interest vesting irrevocably in Client upon payment in full.'
          ],
          footerText: 'Page 1 of 2 — Master Services Agreement'
        },
        {
          pageNumber: 2,
          title: 'WARRANTIES & AUTHORIZATION',
          paragraphs: [
            '5. WARRANTIES. Contractor warrants that all deliverables will be executed in a professional, workmanlike manner meeting prevailing industry standards, and will not knowingly infringe on any third-party intellectual property.',
            '6. LIMITATION OF LIABILITY. Neither party shall be liable for indirect, incidental, or consequential damages arising under this Agreement, capped at total aggregate fees paid in the preceding twelve (12) month period.',
            '7. SEVERABILITY & EXECUTION. If any provision is held unenforceable, remaining provisions remain in full effect. Electronic execution shall be considered legally binding across all jurisdictions.',
            'IN WITNESS WHEREOF, the authorized officers have signed this Master Services Agreement as of the date indicated below.'
          ],
          footerText: 'Page 2 of 2 — Signature Verification'
        }
      ]
    },
    defaultRecipients: [
      {
        name: 'Client Executive',
        email: 'client.exec@firm.com',
        role: 'signer',
        order: 1,
        color: '#2563EB',
      },
      {
        name: 'Lead Consultant',
        email: 'consultant@studio.dev',
        role: 'signer',
        order: 2,
        color: '#0891B2',
      }
    ],
    defaultFields: (recipientIds: string[]) => [
      {
        id: 'f_msa_c_sig',
        type: 'signature',
        pageNumber: 2,
        x: 8,
        y: 62,
        width: 38,
        height: 10,
        recipientId: recipientIds[0],
        required: true,
        label: 'Client Signature'
      },
      {
        id: 'f_msa_c_title',
        type: 'title',
        pageNumber: 2,
        x: 8,
        y: 74,
        width: 38,
        height: 6,
        recipientId: recipientIds[0],
        required: true,
        label: 'Title & Organization'
      },
      {
        id: 'f_msa_con_sig',
        type: 'signature',
        pageNumber: 2,
        x: 54,
        y: 62,
        width: 38,
        height: 10,
        recipientId: recipientIds[1] || recipientIds[0],
        required: true,
        label: 'Consultant Signature'
      },
      {
        id: 'f_msa_con_date',
        type: 'date',
        pageNumber: 2,
        x: 54,
        y: 74,
        width: 38,
        height: 6,
        recipientId: recipientIds[1] || recipientIds[0],
        required: true,
        label: 'Date Signed'
      }
    ]
  }
];
