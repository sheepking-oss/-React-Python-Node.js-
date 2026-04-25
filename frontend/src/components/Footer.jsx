import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Mail, ExternalLink } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const navLinks = [
    {
      title: '功能模块',
      links: [
        { label: '职位搜索', path: '/search' },
        { label: '数据分析', path: '/analysis' },
        { label: '实时看板', path: '/dashboard' },
        { label: '我的收藏', path: '/favorites' },
      ],
    },
    {
      title: '数据来源',
      links: [
        { label: '模拟招聘网', path: '#' },
        { label: '数据聚合', path: '#' },
        { label: '实时更新', path: '#' },
      ],
    },
    {
      title: '关于我们',
      links: [
        { label: '项目介绍', path: '#' },
        { label: '技术文档', path: '#' },
        { label: '联系我们', path: '#' },
      ],
    },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">职</span>
              </div>
              <span className="text-xl font-bold text-white">招聘岗位分析系统</span>
            </Link>
            <p className="text-gray-400 text-sm mb-4 max-w-md">
              汇聚多平台招聘信息，提供智能搜索、职位对比、数据分析等功能，
              帮助您更好地了解就业市场动态，做出更明智的职业决策。
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {navLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.path.startsWith('http') || link.path === '#' ? (
                      <a
                        href={link.path}
                        className="text-gray-400 hover:text-white text-sm transition-colors flex items-center space-x-1"
                      >
                        <span>{link.label}</span>
                        {link.path.startsWith('http') && (
                          <ExternalLink className="w-3 h-3" />
                        )}
                      </a>
                    ) : (
                      <Link
                        to={link.path}
                        className="text-gray-400 hover:text-white text-sm transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © {currentYear} 招聘岗位分析系统. 保留所有权利。
            </p>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                隐私政策
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                使用条款
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Cookie 设置
              </a>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-gray-500 text-xs">
              免责声明：本系统中的职位信息仅供参考，数据来源于公开网络，如有侵权请联系删除。
              薪资数据仅供参考，实际薪资请以招聘方为准。
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
