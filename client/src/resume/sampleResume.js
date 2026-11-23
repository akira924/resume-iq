// Sample resume JSON shown in the Resume page until the user pastes their own.
export const SAMPLE_RESUME = {
  personal_info: {
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '+1-555-123-4567',
    location: 'Austin, TX, USA',
  },
  headline: 'Full-Stack Software Engineer | React | Node.js | Python',
  online_presence: {
    linkedin: 'https://www.linkedin.com/in/alexmorgan',
    github: 'https://github.com/alexmorgan',
    website: 'https://alexmorgan.dev',
  },
  company_target: "Apple",
  summary:
    'Results-driven Full-Stack Software Engineer with 6+ years of experience designing, developing, and deploying scalable web applications. Proficient in React, Node.js, Python, and cloud technologies. Experienced in building RESTful APIs, optimizing application performance, designing database architectures, and collaborating with cross-functional teams to deliver high-quality software solutions.',
  skillsets: [
    { category: 'Programming Languages', skills: ['JavaScript', 'TypeScript', 'Python', 'Java', 'SQL'] },
    { category: 'Frontend Development', skills: ['React', 'Next.js', 'HTML5', 'CSS3', 'Tailwind CSS', 'Redux'] },
    { category: 'Backend Development', skills: ['Node.js', 'Express.js', 'Django', 'REST APIs', 'GraphQL'] },
    { category: 'Databases', skills: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis'] },
    { category: 'Cloud and DevOps', skills: ['AWS', 'Docker', 'Kubernetes', 'GitHub Actions', 'CI/CD'] },
    { category: 'Development Tools', skills: ['Git', 'GitHub', 'Jira', 'Postman', 'VS Code'] },
  ],
  experience: [
    {
      company: 'TechNova Solutions',
      location: 'Austin, TX, USA',
      title: 'Senior Full-Stack Software Engineer',
      period: 'January 2023 - Present',
      sentences: [
        'Designed and developed scalable web applications using React, Next.js, and Node.js, improving application performance by 35%.',
        'Architected RESTful APIs and integrated third-party services to support business-critical workflows.',
        'Optimized PostgreSQL queries and database structures, reducing average API response time by 40%.',
        'Implemented automated CI/CD pipelines using GitHub Actions and Docker, reducing deployment time by 50%.',
        'Mentored junior developers and collaborated with product managers and designers to deliver new features.',
      ],
      used_skills: ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'GitHub Actions'],
      role_description:
        'Responsible for leading full-stack development initiatives, designing application architecture, building scalable backend services, optimizing frontend performance, and mentoring engineering team members.',
    },
    {
      company: 'DigitalCraft Technologies',
      location: 'Dallas, TX, USA',
      title: 'Software Engineer',
      period: 'June 2020 - December 2022',
      sentences: [
        'Developed responsive user interfaces using React, Redux, and modern JavaScript.',
        'Built backend services and REST APIs using Node.js and Express.js.',
        'Integrated MongoDB and PostgreSQL databases to support application data requirements.',
        'Improved application reliability by implementing automated unit and integration tests.',
        'Participated in Agile development processes, code reviews, and sprint planning.',
      ],
      used_skills: ['JavaScript', 'React', 'Redux', 'Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'Jest'],
      role_description:
        'Developed and maintained enterprise web applications, implemented frontend and backend features, integrated databases, and collaborated with cross-functional teams to improve software quality.',
    },
    {
      company: 'WebSphere Innovations',
      location: 'Houston, TX, USA',
      title: 'Junior Web Developer',
      period: 'July 2018 - May 2020',
      sentences: [
        'Developed and maintained responsive websites using HTML, CSS, JavaScript, and Bootstrap.',
        'Assisted in implementing backend functionality using Python and Django.',
        'Fixed software bugs and improved website usability across multiple browsers and devices.',
        'Collaborated with senior developers to implement new features and maintain existing applications.',
      ],
      used_skills: ['HTML5', 'CSS3', 'JavaScript', 'Python', 'Django', 'Bootstrap', 'Git'],
      role_description:
        'Supported web application development and maintenance by building user interfaces, implementing backend features, troubleshooting issues, and collaborating with senior engineering staff.',
    },
  ],
  education: [
    {
      institution: 'University of Texas at Austin',
      major_degree: 'Bachelor of Science in Computer Science',
      period: 'August 2014 - May 2018',
    },
    {
      institution: 'Austin Community College',
      major_degree: 'Associate Degree in Information Technology',
      period: 'August 2012 - May 2014',
    },
  ],
  certification: [
    { institution: 'Amazon Web Services', name: 'AWS Certified Solutions Architect - Associate', date: 'March 2024' },
    { institution: 'Meta', name: 'Meta Front-End Developer Professional Certificate', date: 'September 2022' },
    { institution: 'freeCodeCamp', name: 'Back End Development and APIs Certification', date: 'June 2021' },
  ],
}
