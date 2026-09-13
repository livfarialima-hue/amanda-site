// Public identity contract. Keep the legacy @id stable; a doctor is a Person,
// while MedicalClinic describes the place. These nodes make no authorship claim.
export const SITE_ORIGIN = 'https://draamandaschroeder.com.br';
export const PROFILE_URL = `${SITE_ORIGIN}/dra-amanda-schroeder/`;

export function medicalIdentityGraph() {
  return [
    {
      '@type': 'Person', '@id': `${SITE_ORIGIN}/#physician`,
      name: 'Dra. Amanda Schroeder', jobTitle: 'Médica cirurgiã plástica',
      url: PROFILE_URL,
      image: `${SITE_ORIGIN}/campanhas/assets/amanda-profissional-hero.webp`,
      identifier: [
        { '@type': 'PropertyValue', name: 'CRM-SP', value: '191605' },
        { '@type': 'PropertyValue', name: 'RQE', value: '110472' },
      ],
      alumniOf: [
        { '@type': 'CollegeOrUniversity', name: 'Universidade Estadual de Campinas', alternateName: 'UNICAMP' },
        { '@type': 'EducationalOrganization', name: 'Hospital Israelita Albert Einstein' },
      ],
      memberOf: { '@type': 'Organization', name: 'Sociedade Brasileira de Cirurgia Plástica', alternateName: 'SBCP', url: 'https://www.cirurgiaplastica.org.br/' },
      worksFor: { '@id': `${SITE_ORIGIN}/#clinic` },
      sameAs: ['https://www.instagram.com/dra.amanda_plastica/'],
      telephone: '+55 11 96195-7144',
    },
    {
      '@type': 'MedicalClinic', '@id': `${SITE_ORIGIN}/#clinic`,
      name: 'Clínica LIV Faria Lima', url: `${SITE_ORIGIN}/#clinica-liv`,
      sameAs: ['https://livfarialima.com.br/'],
      image: `${SITE_ORIGIN}/campanhas/assets/clinica-liv-faria-lima.webp`,
      address: { '@type': 'PostalAddress', streetAddress: 'Rua Pais Leme, 215, conjunto 710, Pinheiros', addressLocality: 'São Paulo', addressRegion: 'SP', postalCode: '05424-150', addressCountry: 'BR' },
      telephone: '+55 11 96195-7144',
      hasMap: 'https://maps.app.goo.gl/yDFBmbcn5oDpHSM46',
    },
    {
      '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`,
      url: `${SITE_ORIGIN}/`, name: 'Dra. Amanda Schroeder', inLanguage: 'pt-BR',
      publisher: { '@id': `${SITE_ORIGIN}/#physician` },
    },
  ];
}
