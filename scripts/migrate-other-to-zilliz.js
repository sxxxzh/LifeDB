require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { ZillizClient } = require('../lib/zilliz-client');
const { EmbeddingService } = require('../lib/embedding-service');

const DATA_DIR = path.resolve(__dirname, '..', 'api文档', 'Data');
const BLOG_SQL_PATH = path.join(DATA_DIR, 'blog_data.sql');
const PROJECTS_MD_PATH = path.join(DATA_DIR, '项目超详细总结.md');

const BATCH_SIZE = 10;

// ============================================================
// 1. 解析 blog_data.sql，提取 posts
// ============================================================
function parseBlogPosts(sqlContent) {
  const posts = [];

  // 匹配 INSERT INTO "posts" (...columns...) VALUES(...);
  // content 字段被 replace('...','\n',char(10)) 包裹
  const lineRegex = /INSERT\s+INTO\s+"posts"\s*\([^)]*\)\s*VALUES\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*replace\s*\(\s*'([\s\S]*?)'\s*,\s*'\\n'\s*,\s*char\s*\(\s*10\s*\)\s*\)\s*,\s*'([^']*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;

  let match;
  while ((match = lineRegex.exec(sqlContent)) !== null) {
    const [, id, userId, title, rawContent, status, createdAtStr, updatedAtStr] = match;
    const content = rawContent.replace(/\\n/g, '\n');
    posts.push({
      id,
      user_id: userId,
      title,
      content,
      status,
      created_at: parseInt(createdAtStr),
      updated_at: parseInt(updatedAtStr),
    });
  }

  return posts;
}

// ============================================================
// 2. 解析 项目超详细总结.md，按单个项目拆分
// ============================================================
function stripDirectoryTree(text) {
  // 去掉 "**目录架构**：" 到下一个 "**" 标题或 "---" 之间的目录树噪音
  const cleaned = text.replace(/\*\*目录架构\*\*[：:]?\s*```[\s\S]*?```/g, '');
  return cleaned.replace(/\*\*目录架构\*\*[：:]\s*[\s\S]*?(?=\n\*\*|\n---|$)/g, '');
}

function cleanTechStack(techText) {
  return techText
    .replace(/^\s*-\s*\*\*/gm, '')
    .replace(/\*\*\s*/g, '')
    .replace(/[：:]/g, '：')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('- **') && !s.startsWith('```'))
    .join('，')
    .replace(/，+/g, '，')
    .replace(/，$/g, '')
    .trim() || techText;
}

function extractSection(text, label) {
  const regex = new RegExp(`\\*\\*${label}\\*\\*[：:]\\s*([\\s\\S]*?)(?=\\n\\*\\*[^\\*]+\\*\\*[：:]|\n---|$)`, 'i');
  const m = text.match(regex);
  return m ? m[1].trim() : '';
}

function parseProjects(mdContent) {
  const projects = [];

  const sectionRegex = /(#{3,4}\s+\d+\.\s+.*?)(?=\n#{3,4}\s+\d+\.\s|\n#{2,3}\s+(?:一|二|三|四|五)|$)/gs;

  let match;
  let index = 0;
  while ((match = sectionRegex.exec(mdContent)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;

    const nameMatch = raw.match(/^#{3,4}\s+\d+\.\s+(.+)/);
    const name = nameMatch ? nameMatch[1].trim() : `项目_${index}`;

    const githubMatch = raw.match(/\*\*GitHub链接\*\*[：:]\s*\[([^\]]*)\]\(([^)]*)\)/);
    const githubUrl = githubMatch ? githubMatch[2] : null;
    const domainMatch = raw.match(/\*\*域名\*\*[：:]\s*(.+)/);
    const domain = domainMatch ? domainMatch[1].trim() : null;

    const techStack = cleanTechStack(extractSection(raw, '技术栈'));
    const funcDesign = extractSection(raw, '功能设计');
    const archFeatures = extractSection(raw, '架构特点');

    const cleanedRaw = stripDirectoryTree(raw);

    projects.push({
      name,
      githubUrl,
      domain,
      techStack,
      funcDesign,
      archFeatures,
      description: cleanedRaw,
      index: index++,
    });
  }

  return projects;
}

// ============================================================
// 3. 构建 embedding 文本
// ============================================================
function buildBlogEmbeddingText(post) {
  return `标题：${post.title}\n\n${post.content}`;
}

function buildProjectEmbeddingText(project) {
  const parts = [`项目名称：${project.name}`];
  if (project.techStack) parts.push(`技术栈：${project.techStack}`);
  if (project.domain) parts.push(`域名：${project.domain}`);
  if (project.funcDesign) parts.push(`功能：${project.funcDesign}`);
  if (project.archFeatures) parts.push(`架构：${project.archFeatures}`);
  return parts.join('\n');
}

// ============================================================
// 4. 个人信息实体
// ============================================================
function buildPersonalInfoEntity() {
  const text = [
    '博主是谁？博主叫什么？博主叫什么名字？博主姓名？答：博主是申志昊，网名szhao、stazenith、sxxxzh。',
    '申志昊就是这个项目的所有者，所有博客文章、数据库记录、项目总结都归申志昊所有。',
    '申志昊也叫szhao，也叫stazenith，GitHub用户名是sxxxzh，是郑州轻工业大学数字媒体技术专业大三学生，20岁。',
    '申志昊就是博主本人，也是项目创建者。',
    '申志昊是一名全栈开发者，求职意向是AI辅助全栈开发偏向后端，熟悉Spring Boot、React、Vue、Flask、Node.js。',
    '联系方式：手机号17703974967，微信号17703974967，邮箱3172942140@qq.com。',
    '博主的电话和微信都是17703974967，博主的邮箱是3172942140@qq.com。',
    '博主开发过的项目：FileCloud云盘、LifeDB生命数据库、个人博客系统、Android博客客户端。',
    'GitHub：https://github.com/sxxxzh，博客：https://www.szhaovo.cn，简历：https://my-blog5-0.vercel.app/#/resume',
    '博主是申志昊，申志昊就是szhao，就是sxxxzh，就是stazenith，就是这个项目的创建者和所有者。',
    '你是谁？我是申志昊的个人知识助手，申志昊的所有资料我都知道。',
    '博主的名字是申志昊，博主叫什么名字？申志昊。博主姓名申志昊。',
  ].join('\n');

  const contentHash = crypto.createHash('md5').update(text.replace(/\s+/g, ' ').trim().toLowerCase(), 'utf8').digest('hex');
  return {
    entity_id: 'personal_info',
    content_hash: contentHash,
    embedding_text: text,
    metadata: {
      source_type: 'personal',
      source_id: 'personal_info',
      name: '申志昊',
      aliases: ['szhao', 'stazenith', 'sxxxzh'],
      phone: '17703974967',
      email: '3172942140@qq.com',
      age: 20,
      university: '郑州轻工业大学',
      major: '数字媒体技术',
      job_preference: 'AI辅助全栈开发（偏向后端）',
      resume_url: 'https://my-blog5-0.vercel.app/#/resume',
      github: 'https://github.com/sxxxzh',
      blog: 'https://www.szhaovo.cn',
      is_canonical: true,
      canonical_id: 'personal_info',
    },
  };
}

// ============================================================
// 5. 清空已有非 moments 数据
// ============================================================
async function clearNonMoments(zilliz) {
  console.log('\n--- 清空已有的非 moments 数据 ---');

  try {
    const sources = ['blog_post', 'project', 'personal'];

    // 1. 从 content_index 查所有非 moments 实体的 zilliz_entity_id
    const { data: idxData, error: idxErr } = await supabase
      .from('zilliz_content_index')
      .select('zilliz_entity_id')
      .in('source_table', sources);

    if (idxErr) {
      console.log('  索引查询失败:', idxErr.message);
    }

    // 2. 删除 Zilliz 实体
    const allIds = (idxData || []).map(r => r.zilliz_entity_id).filter(Boolean);
    // 补充固定 ID（防止索引丢失）
    ['personal_info'].forEach(id => { if (!allIds.includes(id)) allIds.push(id); });

    if (allIds.length > 0) {
      console.log(`  正在删除 ${allIds.length} 个 Zilliz 实体...`);
      try {
        await deleteInBatches(zilliz, allIds, 50);
        console.log('  Zilliz 实体: 已清理');
      } catch (err) {
        console.log('  Zilliz 删除异常:', err.message);
      }
    } else {
      console.log('  Zilliz: 无需清理 (无历史数据)');
    }

    // 3. 清理 content_index
    const { error: delErr } = await supabase
      .from('zilliz_content_index')
      .delete()
      .in('source_table', sources);
    if (delErr) {
      console.log('  内容索引清理异常:', delErr.message);
    } else {
      console.log('  内容索引: 已清理');
    }

  } catch (err) {
    console.log('  清理异常:', err.message);
  }
}

async function deleteInBatches(zilliz, ids, batchSize) {
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const filter = batch.map(id => `id == "${id.replace(/"/g, '\\"')}"`).join(' or ');
    await zilliz.delete(filter);
  }
}
async function migrateBatch(zilliz, embedding, entities, label, startTime) {
  const MAX_DURATION = 45000;
  let total = 0;
  let errors = 0;

  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    if (Date.now() - startTime > MAX_DURATION) {
      console.log(`\n  达到时间限制 (${MAX_DURATION / 1000}s)，剩余 ${entities.length - i} 条下次继续`);
      break;
    }

    const batch = entities.slice(i, i + BATCH_SIZE);
    const texts = batch.map(e => e.embedding_text);
    const embeddings = await embedding.embedBatch(texts);

    const zillizEntities = batch.map((e, idx) => ({
      id: e.entity_id,
      content_hash: e.content_hash,
      content_type: 'text',
      embedding: embeddings[idx],
      text_preview: e.embedding_text.substring(0, 500),
      metadata: JSON.stringify(e.metadata),
    }));

    try {
      await zilliz.upsert(zillizEntities);
      total += zillizEntities.length;
      console.log(`  [${label}] 已写入 ${total}/${entities.length} 条`);

      // 写入内容索引
      for (const e of zillizEntities) {
        const meta = JSON.parse(e.metadata);
        try {
          await supabase.from('zilliz_content_index').insert({
            content_hash: e.content_hash,
            source_table: meta.source_type,
            source_id: String(meta.source_id),
            content_type: 'text',
            is_duplicate: false,
            canonical_moment_id: null,
            zilliz_entity_id: e.id,
            indexed_at: new Date().toISOString(),
          });
        } catch (idxErr) {
          if (idxErr.code === '23505') {
            await supabase.from('zilliz_content_index')
              .update({
                source_table: meta.source_type,
                source_id: String(meta.source_id),
                zilliz_entity_id: e.id,
                indexed_at: new Date().toISOString(),
              })
              .eq('content_hash', e.content_hash);
          }
        }
      }
    } catch (err) {
      console.error(`  [${label}] 写入失败:`, err.message);
      errors += zillizEntities.length;
    }
  }

  return { total, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');

  console.log('=== 非 moments 数据源迁移至 Zilliz ===');
  if (shouldClear) console.log('(清空模式: 将先删除已有数据再导入)');
  console.log();

  const zilliz = new ZillizClient();
  const embedding = new EmbeddingService();

  if (!zilliz.available) {
    console.error('Zilliz 未配置，退出');
    process.exit(1);
  }

  if (!embedding.available) {
    console.error('Embedding 未配置，退出');
    process.exit(1);
  }

  await zilliz.ensureCollection();

  if (shouldClear) {
    await clearNonMoments(zilliz);
  }

  // -------- 数据源 0: 个人信息 --------
  console.log('\n--- 数据源 0: 个人信息 ---');
  const personalEntity = buildPersonalInfoEntity();
  console.log(`  构建个人信息: ${personalEntity.metadata.name} / ${personalEntity.metadata.aliases.join(', ')}`);

  // -------- 数据源 1: 博客文章 --------
  console.log('\n--- 数据源 1: 博客文章 (blog_data.sql) ---');
  let blogEntities = [];

  if (fs.existsSync(BLOG_SQL_PATH)) {
    const sqlContent = fs.readFileSync(BLOG_SQL_PATH, 'utf-8');
    const posts = parseBlogPosts(sqlContent);
    console.log(`  解析到 ${posts.length} 篇博客文章`);

    for (const post of posts) {
      const text = buildBlogEmbeddingText(post);
      const contentHash = crypto.createHash('md5').update(text.replace(/\s+/g, ' ').trim().toLowerCase(), 'utf8').digest('hex');
      blogEntities.push({
        entity_id: `blog_post_${post.id}`,
        content_hash: contentHash,
        embedding_text: text,
        metadata: {
          source_type: 'blog_post',
          source_id: post.id,
          title: post.title,
          status: post.status,
          author_id: post.user_id,
          author_name: post.user_id === 'admin-123456' ? 'szhAo' : null,
          created_at: new Date(post.created_at * 1000).toISOString(),
          updated_at: new Date(post.updated_at * 1000).toISOString(),
          is_canonical: true,
          canonical_id: `blog_post_${post.id}`,
        },
      });
    }
  } else {
    console.log(`  文件不存在: ${BLOG_SQL_PATH}`);
  }

  // -------- 数据源 2: 项目总结 --------
  console.log('\n--- 数据源 2: 项目总结 (项目超详细总结.md) ---');
  let projectEntities = [];

  if (fs.existsSync(PROJECTS_MD_PATH)) {
    const mdContent = fs.readFileSync(PROJECTS_MD_PATH, 'utf-8');
    const projects = parseProjects(mdContent);
    console.log(`  解析到 ${projects.length} 个项目`);

    for (const proj of projects) {
      const text = buildProjectEmbeddingText(proj);
      const contentHash = crypto.createHash('md5').update(text.replace(/\s+/g, ' ').trim().toLowerCase(), 'utf8').digest('hex');
      projectEntities.push({
        entity_id: `project_${proj.index}`,
        content_hash: contentHash,
        embedding_text: text,
        metadata: {
          source_type: 'project',
          source_id: `project_${proj.index}`,
          project_name: proj.name,
          github_url: proj.githubUrl,
          domain: proj.domain,
          tech_stack: proj.techStack,
          func_design: (proj.funcDesign || '').substring(0, 1000),
          arch_features: (proj.archFeatures || '').substring(0, 1000),
          is_canonical: true,
          canonical_id: `project_${proj.index}`,
        },
      });
    }
  } else {
    console.log(`  文件不存在: ${PROJECTS_MD_PATH}`);
  }

  // -------- 执行迁移 --------
  const startTime = Date.now();

  // 先导入个人信息
  console.log(`\n导入个人信息...`);
  const personalRes = await migrateBatch(zilliz, embedding, [personalEntity], '个人信息', startTime);
  console.log(`  个人信息: 成功 ${personalRes.total}, 失败 ${personalRes.errors}`);

  if (blogEntities.length > 0) {
    console.log(`\n开始迁移 ${blogEntities.length} 篇博客文章...`);
    const res = await migrateBatch(zilliz, embedding, blogEntities, '博客', startTime);
    console.log(`  博客迁移完成: 成功 ${res.total}, 失败 ${res.errors}`);
  }

  if (projectEntities.length > 0) {
    console.log(`\n开始迁移 ${projectEntities.length} 个项目...`);
    const res = await migrateBatch(zilliz, embedding, projectEntities, '项目', startTime);
    console.log(`  项目迁移完成: 成功 ${res.total}, 失败 ${res.errors}`);
  }

  console.log('\n=== 迁移完成 ===');
  console.log(`总计导入: 1 个人信息 + ${blogEntities.length} 博客 + ${projectEntities.length} 项目`);
  process.exit(0);
}

main().catch(err => {
  console.error('迁移脚本异常:', err);
  process.exit(1);
});
