export interface LabTest {
  id: string;
  label: string;
  conceptUuid: string;
}

export interface LabTestCategory {
  id: string;
  label: string;
  tests: LabTest[];
}

export interface LabRequestFormData {
  clinicalNote: string;
  urgency: 'ROUTINE' | 'STAT';
  selectedTests: string[]; // array of test IDs
  otherTests: string;
}

// ── All test categories from the lab request forms ────────────────────

export const LAB_TEST_CATEGORIES: LabTestCategory[] = [
  // ══════ IMAGE 2 (Front Page) ══════
  {
    id: 'haematology',
    label: 'Haematology',
    tests: [
      { id: 'cbc', label: 'CBC', conceptUuid: '1019AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'esr', label: 'ESR', conceptUuid: '857AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'malaria_bs', label: 'Malaria B/S', conceptUuid: '32AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'malaria_rdt', label: 'Malaria RDT', conceptUuid: '1643AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'reticulocyte_count', label: 'Reticulocyte Count', conceptUuid: '1327AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hb_electrophoresis', label: 'Hb Electrophoresis', conceptUuid: '164561AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'blood_group', label: 'Blood Group', conceptUuid: '300AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'sickle_cell_rapid', label: 'Sickle Cell Test-Rapid', conceptUuid: '164562AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'fluid_cell_count_diff', label: 'Fluid Cell Count + DIFF', conceptUuid: '163583AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'film_comment_haem', label: 'Film Comment', conceptUuid: '1325AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'iron_profile', label: 'Iron Profile', conceptUuid: '160570AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ferritin_haem', label: 'Ferritin', conceptUuid: '2311AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'folate_haem', label: 'Folate', conceptUuid: '1326AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'vitamin_b12_haem', label: 'Vitamin B12', conceptUuid: '1334AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'serology',
    label: 'Serology',
    tests: [
      { id: 'salmonella_igg_igm', label: 'Salmonella typhi IgG/IgM', conceptUuid: '163675AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'salmonella_ag', label: 'Salmonella typhi Ag', conceptUuid: '163676AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'widal_test', label: 'Salmonella Widal Test', conceptUuid: '306AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'brucella', label: 'Brucella', conceptUuid: '163677AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'h_pylori_ag', label: 'H. Pylori Ag', conceptUuid: '163678AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'h_pylori_ab', label: 'H. Pylori Ab', conceptUuid: '163679AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'rf_serology', label: 'RF (Rheumatoid Factor)', conceptUuid: '161545AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'crp', label: 'CRP', conceptUuid: '161490AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'tpha_syphilis', label: 'TPHA Syphilis', conceptUuid: '1031AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'rpr_syphilis', label: 'RPR Syphilis', conceptUuid: '1619AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hepatitis_bsag_ser', label: 'Hepatitis BsAg', conceptUuid: '1322AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hepatitis_c_rapid', label: 'Hepatitis C Rapid', conceptUuid: '1325AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hiv_12_ser', label: 'HIV 1/2', conceptUuid: '1040AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'crag_ag', label: 'CRAG Ag CSF/Serum', conceptUuid: '163680AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'gonorrhea_rapid', label: 'Gonorrhea Rapid', conceptUuid: '163681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'chlamydia_ag', label: 'Chlamydia Ag', conceptUuid: '163682AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'faecal_occult_blood', label: 'Faecal Occult Blood', conceptUuid: '163683AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hcg_urine', label: 'HCG (Urine)', conceptUuid: '45AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hcg_serum', label: 'HCG (Serum)', conceptUuid: '1945AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'toxo_igg_igm', label: 'Toxo IgG/IgM', conceptUuid: '163684AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'cmv_igg_igm', label: 'CMV IgG/IgM', conceptUuid: '163685AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'rubella_igg_igm', label: 'Rubella IgG/IgM', conceptUuid: '163686AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hsv_12_igg', label: 'HSV 1/2 IgG', conceptUuid: '163687AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hsv_12_igm', label: 'HSV 1/2 IgM', conceptUuid: '163688AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'liver_function',
    label: 'Liver Function Tests',
    tests: [
      { id: 'lfts_panel', label: 'LFTs (Panel)', conceptUuid: '1015AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ast_sgot', label: 'AST/sGOT', conceptUuid: '653AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'alt_sgpt', label: 'ALT/SGPT', conceptUuid: '654AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'albumin', label: 'Albumin', conceptUuid: '848AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'total_protein', label: 'Total Protein', conceptUuid: '717AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'bilirubin_total', label: 'Bilirubin Total', conceptUuid: '655AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'bilirubin_direct', label: 'Bilirubin Direct/Indirect', conceptUuid: '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'alkaline_phosphatase_lft', label: 'Alkaline Phosphatase', conceptUuid: '785AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ggt', label: 'GGT (γ-GT)', conceptUuid: '653AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'g6pd', label: 'G6PD Quantitative', conceptUuid: '163689AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'pancreas',
    label: 'Pancreas',
    tests: [
      { id: 'amylase', label: 'Amylase', conceptUuid: '1299AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'lipase', label: 'Lipase', conceptUuid: '163690AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'renal_function',
    label: 'Renal Function Tests',
    tests: [
      { id: 'rfts_panel', label: 'RFTs (Panel)', conceptUuid: '1012AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'urea', label: 'Urea', conceptUuid: '857AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'creatinine', label: 'Creatinine', conceptUuid: '790AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'electrolytes_panel', label: 'Electrolytes (Na, K, Cl)', conceptUuid: '1132AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'sodium', label: 'Sodium', conceptUuid: '1132AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'potassium', label: 'Potassium', conceptUuid: '1133AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'chloride', label: 'Chloride', conceptUuid: '1134AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'bicarbonate', label: 'Bicarbonate', conceptUuid: '163691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'egfr', label: 'eGFR', conceptUuid: '163692AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'calcium_renal', label: 'Calcium', conceptUuid: '1007AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'phosphate_renal', label: 'Phosphate', conceptUuid: '163693AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'magnesium', label: 'Magnesium (Serum)', conceptUuid: '163694AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'uric_acid', label: 'Uric Acid', conceptUuid: '1008AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'cystatin_c', label: 'Cystatin C', conceptUuid: '163695AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'lipid_metabolism',
    label: 'Lipid Metabolism',
    tests: [
      { id: 'micro_albumin', label: 'Micro Albumin', conceptUuid: '163696AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'lipoprotein_panel', label: 'Lipoprotein (Panel)', conceptUuid: '1014AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'cholesterol_total', label: 'Cholesterol Total', conceptUuid: '1006AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ldl', label: 'LDL', conceptUuid: '1018AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hdl', label: 'HDL', conceptUuid: '1017AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'triglycerides', label: 'Triglycerides', conceptUuid: '1009AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'cardiac_markers',
    label: 'Cardiac Markers',
    tests: [
      { id: 'cardiac_profile', label: 'Cardiac Profile', conceptUuid: '163697AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'troponin_i', label: 'Troponin I', conceptUuid: '163698AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ck', label: 'CK', conceptUuid: '163699AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ckmb', label: 'CKMB', conceptUuid: '163700AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ldh', label: 'LDH', conceptUuid: '163701AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ast_sgot_cardiac', label: 'AST/SGOT', conceptUuid: '653AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hs_crp', label: 'High Sensitivity CRP', conceptUuid: '163702AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'probnp', label: 'ProBNP', conceptUuid: '163703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'myoglobin', label: 'Myoglobin', conceptUuid: '163704AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'molecular_biology',
    label: 'Molecular Biology',
    tests: [
      { id: 'hiv_dna_pcr', label: 'HIV DNA PCR', conceptUuid: '844AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hep_b_viral_load', label: 'Hepatitis B Viral Load', conceptUuid: '163705AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hep_c_viral_load', label: 'Hepatitis C Viral Load', conceptUuid: '163706AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'xpert_mtb_rif', label: 'Xpert MTB/RIF', conceptUuid: '162202AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hpv_cervical_pcr', label: 'HPV Cervical Cancer PCR', conceptUuid: '163707AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'bcr_abl', label: 'BCR-ABL for Monitoring', conceptUuid: '163708AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'dna_paternity', label: 'DNA Paternity Test', conceptUuid: '163709AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },

  // ══════ IMAGE 1 (Back Page) ══════
  {
    id: 'coagulation',
    label: 'Coagulation',
    tests: [
      { id: 'bleeding_time', label: 'Bleeding Time', conceptUuid: '163710AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'clotting_time', label: 'Clotting Time', conceptUuid: '163711AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'pt_inr', label: 'PT/INR', conceptUuid: '163712AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'aptt', label: 'aPTT', conceptUuid: '163713AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'd_dimer', label: 'D-dimer', conceptUuid: '163714AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'fibrinogen', label: 'Fibrinogen', conceptUuid: '163715AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'tumour_markers',
    label: 'Tumour Markers',
    tests: [
      { id: 'afp', label: 'Alpha Feto Protein (AFP)', conceptUuid: '163716AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'psa', label: 'Prostatic Specific Antigen (PSA)', conceptUuid: '163717AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'free_psa', label: 'Free-PSA (fPSA)', conceptUuid: '163718AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'beta_hcg', label: 'Beta-HCG (bHCG)', conceptUuid: '163719AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'cea', label: 'Carcino Embryonic Antigen (CEA)', conceptUuid: '163720AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ca_15_3', label: 'Breast Cancer (CA15-3)', conceptUuid: '163721AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ca_19_9', label: 'Pancreatic Cancer (CA19-9)', conceptUuid: '163722AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ca_125', label: 'Ovarian Cancer (CA125)', conceptUuid: '163723AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'cyfra_21_1', label: 'Lung Cancer (Cyfra 21-1)', conceptUuid: '163724AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'fertility_hormones',
    label: 'Fertility Hormones',
    tests: [
      { id: 'estradiol', label: 'E2 (Estradiol)', conceptUuid: '163725AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'fsh', label: 'FSH', conceptUuid: '163726AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'lh', label: 'LH', conceptUuid: '163727AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'bhcg_quant', label: 'b-HCG Quantitative', conceptUuid: '163728AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'prolactin', label: 'Prolactin', conceptUuid: '163729AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'progesterone', label: 'Progesterone', conceptUuid: '163730AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'testosterone', label: 'Testosterone', conceptUuid: '163731AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'free_testosterone', label: 'Free Testosterone', conceptUuid: '163732AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'amh', label: 'Anti-Mullerian Hormone (AMH)', conceptUuid: '163733AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'thyroid_profile',
    label: 'Thyroid Profile',
    tests: [
      { id: 'tsh', label: 'TSH', conceptUuid: '159473AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'total_t3', label: 'Total T3', conceptUuid: '163734AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'total_t4', label: 'Total T4', conceptUuid: '163735AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'free_t3', label: 'Free T3', conceptUuid: '163736AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'free_t4', label: 'Free T4', conceptUuid: '163737AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'thyroglobulin', label: 'Thyroglobulin', conceptUuid: '163738AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'endocrinology',
    label: 'Endocrinology',
    tests: [
      { id: 'acth', label: 'ACTH', conceptUuid: '163739AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'cortisol_am_pm', label: 'Cortisol AM/PM', conceptUuid: '163740AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'cortisol_random', label: 'Cortisol Random', conceptUuid: '163741AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'dheas', label: 'DHEAS', conceptUuid: '163742AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'aldosterone', label: 'Aldosterone', conceptUuid: '163743AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'parathormone', label: 'Parathormone', conceptUuid: '163744AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'microbiology',
    label: 'Microbiology',
    tests: [
      { id: 'gram_stain', label: 'Gram Stain', conceptUuid: '163745AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'zn_stain', label: 'ZN Stain', conceptUuid: '163746AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'koh', label: 'KOH', conceptUuid: '163747AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'india_ink', label: 'India Ink', conceptUuid: '163748AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'urinalysis', label: 'Urinalysis', conceptUuid: '302AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'stool_analysis', label: 'Stool Analysis', conceptUuid: '163749AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'csf_examination', label: 'CSF Examination', conceptUuid: '163750AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'body_fluid_exam', label: 'Body Fluid Examination', conceptUuid: '163751AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'semen_analysis', label: 'Semen Analysis', conceptUuid: '163752AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'urine_bence_protein', label: 'Urine Bence Protein', conceptUuid: '163753AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'urine_culture', label: 'Urine Culture & Sensitivity', conceptUuid: '163754AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'stool_culture', label: 'Stool Culture & Sensitivity', conceptUuid: '163755AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'sputum_culture', label: 'Sputum Culture & Sensitivity', conceptUuid: '163756AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'blood_culture', label: 'Blood Culture & Sensitivity', conceptUuid: '161477AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'pus_swabs_cs', label: 'Pus/Swabs C&S', conceptUuid: '163757AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hvs_cervical_cs', label: 'HVS/Cervical Swab C&S', conceptUuid: '163758AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'csf_culture', label: 'CSF Culture & Sensitivity', conceptUuid: '163759AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'fungal_culture', label: 'Fungal Culture & Sensitivity', conceptUuid: '163760AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'mycobacteria_cs', label: 'Mycobacteria C&S', conceptUuid: '163761AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'semen_culture', label: 'Semen Culture & Sensitivity', conceptUuid: '163762AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'body_fluid_culture', label: 'Body Fluid Culture & Sensitivity', conceptUuid: '163763AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'hiv',
    label: 'HIV',
    tests: [
      { id: 'hiv_12_rapid', label: 'HIV 1/2 Rapid', conceptUuid: '1040AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hiv_elisa', label: 'HIV ELISA', conceptUuid: '1042AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hiv_dna_pcr_hiv', label: 'HIV DNA PCR', conceptUuid: '844AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'cd4_t_cell', label: 'CD4-T Cell Count', conceptUuid: '5497AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hiv_viral_load', label: 'HIV Viral Load', conceptUuid: '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hiv_drug_resistance', label: 'HIV Drug Resistance Test', conceptUuid: '163764AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'hepatitis_viruses',
    label: 'Hepatitis Viruses',
    tests: [
      { id: 'hep_bsag', label: 'HEP BsAg', conceptUuid: '1322AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hep_bsab', label: 'HEP BsAb', conceptUuid: '163765AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hep_bcab_igm', label: 'HEP BcAb (Total IgM)', conceptUuid: '163766AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hep_beag', label: 'HEP BeAg', conceptUuid: '163767AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hep_bcab', label: 'HEP BcAb', conceptUuid: '163768AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hep_b_viral_load_hep', label: 'HEP B Viral Load', conceptUuid: '163705AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hep_b_immunity', label: 'HEP B Immunity (Sab)', conceptUuid: '163769AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hcv_rapid', label: 'HCV Rapid', conceptUuid: '163770AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hcv_qualitative_pcr', label: 'HCV Qualitative PCR', conceptUuid: '163771AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hcv_viral_load', label: 'HCV Viral Load', conceptUuid: '163706AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hcv_genotyping', label: 'HCV Genotyping', conceptUuid: '163772AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'diabetic_profile',
    label: 'Diabetic Profile',
    tests: [
      { id: 'rbs', label: 'Random Blood Sugar (RBS)', conceptUuid: '887AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'fbs', label: 'Fasting Blood Sugar (FBS)', conceptUuid: '160912AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'gtt', label: 'GTT', conceptUuid: '163773AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'hba1c', label: 'HBA1C', conceptUuid: '159644AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'insulin', label: 'Insulin', conceptUuid: '163774AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'growth_hormone', label: 'Growth Hormone', conceptUuid: '163775AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'igf', label: 'Insulin Like GH (IGF)', conceptUuid: '163776AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'c_peptide', label: 'C-peptide', conceptUuid: '163777AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'bone_profile',
    label: 'Bone Profile',
    tests: [
      { id: 'calcium_bone', label: 'Calcium', conceptUuid: '1007AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'phosphate_bone', label: 'Phosphate', conceptUuid: '163693AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'vit_d3', label: 'Vitamin D3', conceptUuid: '163778AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'pth', label: 'PTH', conceptUuid: '163779AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'calcitonin', label: 'Calcitonin', conceptUuid: '163780AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'alkaline_phosphatase_bone', label: 'Alkaline Phosphatase', conceptUuid: '785AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'anaemia',
    label: 'Anaemia',
    tests: [
      { id: 'fbc', label: 'FBC', conceptUuid: '1019AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'iron_profile_anaemia', label: 'Iron Profile', conceptUuid: '160570AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ferritin_anaemia', label: 'Ferritin', conceptUuid: '2311AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'folate_folic_acid', label: 'Folate/Folic Acid', conceptUuid: '1326AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'vitamin_b12_anaemia', label: 'Vitamin B12', conceptUuid: '1334AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'film_comment_anaemia', label: 'Film Comment', conceptUuid: '1325AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'anaemia_panel', label: 'Anaemia Panel', conceptUuid: '163781AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'immunology',
    label: 'Immunology',
    tests: [
      { id: 'total_ige', label: 'Total IgE', conceptUuid: '163782AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'ana_anf', label: 'ANA/ANF', conceptUuid: '163783AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'allergy_tests', label: 'Allergy Tests', conceptUuid: '163784AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'rf_immunology', label: 'RF (Rheumatoid Factor)', conceptUuid: '161545AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'anca', label: 'ANCA', conceptUuid: '163785AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'cd4_cd8', label: 'CD4/CD8', conceptUuid: '163786AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
  {
    id: 'histopathology',
    label: 'Histopathology',
    tests: [
      { id: 'pap_smear', label: 'PAP Smear', conceptUuid: '885AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'histopath_small', label: 'Histopath Small', conceptUuid: '163787AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'histopath_large', label: 'Histopath Large', conceptUuid: '163788AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'non_gyn_cytology', label: 'Non-Gyn Cytology', conceptUuid: '163789AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ],
  },
];
