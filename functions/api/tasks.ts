interface Env {
  DB: D1Database;
  ACCESS_PASSWORD?: string;
}

// Authorization check helper
async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  const masterPassword = env.ACCESS_PASSWORD || 'globetrek2026';
  
  const msgBuffer = new TextEncoder().encode(masterPassword);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return authHeader === `Bearer ${expectedToken}`;
}

interface TaskBody {
  id: string;
  title: string;
  projectTag: string;
  category?: string;
  targetCity?: string;
  status?: string;
  autoOutreach?: boolean;
  createdDate?: string;
  completedDate?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (!await isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  try {
    const { results } = await env.DB.prepare("SELECT * FROM tasks ORDER BY createdDate DESC").all();
    
    // Convert D1 representation of autoOutreach (1/0) back to boolean
    const tasks = results.map((t: any) => ({
      ...t,
      autoOutreach: t.autoOutreach === 1 || t.autoOutreach === true
    }));

    return new Response(JSON.stringify(tasks), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (!await isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const tasks: TaskBody[] = Array.isArray(body) ? body : [body];

    // Delete any tasks from the DB that are NOT in the incoming request payload (keeps deletes in sync)
    const incomingIds = tasks.map(t => t.id).filter(Boolean);
    if (incomingIds.length > 0) {
      const placeholders = incomingIds.map(() => '?').join(',');
      await env.DB.prepare(`DELETE FROM tasks WHERE id NOT IN (${placeholders})`).bind(...incomingIds).run();
    } else {
      await env.DB.prepare("DELETE FROM tasks").run();
    }

    const sql = `
      INSERT INTO tasks (
        id, title, projectTag, category, targetCity, status, autoOutreach, createdDate, completedDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        projectTag = excluded.projectTag,
        category = excluded.category,
        targetCity = excluded.targetCity,
        status = excluded.status,
        autoOutreach = excluded.autoOutreach,
        completedDate = excluded.completedDate
    `;

    const stmt = env.DB.prepare(sql);
    const statements = tasks.map(t => 
      stmt.bind(
        t.id,
        t.title,
        t.projectTag,
        t.category || '',
        t.targetCity || '',
        t.status || 'Pending',
        t.autoOutreach ? 1 : 0,
        t.createdDate || new Date().toLocaleDateString(),
        t.completedDate || ''
      )
    );

    await env.DB.batch(statements);

    return new Response(JSON.stringify({ success: true, count: tasks.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (!await isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing ID parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
