import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

export const formatSalary = (salaryMin, salaryMax, original) => {
  if (original) {
    return original;
  }
  if (!salaryMin && !salaryMax) {
    return '面议';
  }
  if (salaryMin && salaryMax) {
    return `${(salaryMin / 1000).toFixed(1)}K-${(salaryMax / 1000).toFixed(1)}K/月`;
  }
  if (salaryMin) {
    return `${(salaryMin / 1000).toFixed(1)}K以上/月`;
  }
  return `${(salaryMax / 1000).toFixed(1)}K以下/月`;
};

export const formatSalaryAvg = (salaryAvg) => {
  if (!salaryAvg) {
    return '面议';
  }
  return `${(salaryAvg / 1000).toFixed(1)}K/月`;
};

export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) {
    return '';
  }
  return dayjs(date).format(format);
};

export const formatRelativeDate = (date) => {
  if (!date) {
    return '';
  }
  const now = dayjs();
  const target = dayjs(date);
  const diffDays = now.diff(target, 'day');

  if (diffDays === 0) {
    return '今天';
  }
  if (diffDays === 1) {
    return '昨天';
  }
  if (diffDays < 7) {
    return `${diffDays}天前`;
  }
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周前`;
  }
  if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)}个月前`;
  }
  return `${Math.floor(diffDays / 365)}年前`;
};

export const formatNumber = (num) => {
  if (num === null || num === undefined) {
    return '0';
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  }
  return num.toLocaleString();
};

export const formatPercentage = (num, decimals = 1) => {
  if (num === null || num === undefined) {
    return '0%';
  }
  return `${num.toFixed(decimals)}%`;
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

export const parseSkills = (skillsJson) => {
  if (!skillsJson) {
    return [];
  }
  try {
    const skills = JSON.parse(skillsJson);
    return Array.isArray(skills) ? skills : [];
  } catch (e) {
    return [];
  }
};

export const getSalaryColor = (salaryAvg) => {
  if (!salaryAvg) {
    return 'text-gray-500';
  }
  if (salaryAvg < 10000) {
    return 'text-gray-600';
  }
  if (salaryAvg < 20000) {
    return 'text-green-600';
  }
  if (salaryAvg < 30000) {
    return 'text-blue-600';
  }
  if (salaryAvg < 50000) {
    return 'text-purple-600';
  }
  return 'text-red-600';
};

export const getExperienceLevel = (experience) => {
  if (!experience) {
    return 0;
  }
  const levels = {
    '不限': 0,
    '应届生': 0,
    '1年以内': 1,
    '1-3年': 2,
    '3-5年': 3,
    '5-10年': 4,
    '10年以上': 5,
  };
  return levels[experience] || 0;
};

export const getEducationLevel = (education) => {
  if (!education) {
    return 0;
  }
  const levels = {
    '不限': 0,
    '高中': 1,
    '中专': 1,
    '大专': 2,
    '本科': 3,
    '硕士': 4,
    '博士': 5,
  };
  return levels[education] || 0;
};

export const generateComparisonMatrix = (jobs) => {
  if (!jobs || jobs.length === 0) {
    return [];
  }

  const matrix = [];

  matrix.push({
    category: '职位信息',
    items: [
      { label: '职位名称', values: jobs.map((j) => j.title) },
      { label: '公司名称', values: jobs.map((j) => j.company_name) },
      { label: '工作城市', values: jobs.map((j) => j.city || '不限') },
      { label: '工作类型', values: jobs.map((j) => j.job_type || '不限') },
    ],
  });

  matrix.push({
    category: '薪资福利',
    items: [
      {
        label: '薪资范围',
        values: jobs.map((j) => formatSalary(j.salary_min, j.salary_max, j.salary_original)),
      },
      {
        label: '平均薪资',
        values: jobs.map((j) => formatSalaryAvg(j.salary_avg)),
      },
    ],
  });

  matrix.push({
    category: '任职要求',
    items: [
      { label: '学历要求', values: jobs.map((j) => j.education || '不限') },
      { label: '经验要求', values: jobs.map((j) => j.experience || '不限') },
    ],
  });

  matrix.push({
    category: '技能标签',
    items: [
      {
        label: '技能关键词',
        values: jobs.map((j) => {
          const skills = parseSkills(j.skills);
          return skills.length > 0 ? skills.join(', ') : '暂无';
        }),
      },
    ],
  });

  return matrix;
};

export const findBestMatch = (jobs, criteria) => {
  if (!jobs || jobs.length === 0) {
    return null;
  }

  const scores = jobs.map((job) => {
    let score = 0;

    if (criteria.salaryMin && job.salary_avg) {
      if (job.salary_avg >= criteria.salaryMin) {
        score += 30;
      }
    }

    if (criteria.experience) {
      const reqLevel = getExperienceLevel(criteria.experience);
      const jobLevel = getExperienceLevel(job.experience);
      if (jobLevel >= reqLevel) {
        score += 20;
      }
    }

    if (criteria.education) {
      const reqLevel = getEducationLevel(criteria.education);
      const jobLevel = getEducationLevel(job.education);
      if (jobLevel >= reqLevel) {
        score += 20;
      }
    }

    if (criteria.skills && criteria.skills.length > 0) {
      const jobSkills = parseSkills(job.skills);
      const matchCount = criteria.skills.filter((s) =>
        jobSkills.includes(s)
      ).length;
      score += (matchCount / criteria.skills.length) * 30;
    }

    return { job, score };
  });

  scores.sort((a, b) => b.score - a.score);

  return scores[0];
};

export const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
