import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuramos las variables de entorno leyendo el .env.local de la app web
// ya que ahí pusiste las credenciales.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltan credenciales de Supabase en el .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const vaultPath = process.env.OBSIDIAN_VAULT_PATH;

if (!vaultPath) {
  console.error("❌ Falta OBSIDIAN_VAULT_PATH en el .env.local");
  console.error("Por favor agrega la ruta a tu bóveda (ej. C:/Users/Crist/OneDrive/Obsidian)");
  process.exit(1);
}

// Función para recolectar archivos .md recursivamente
async function getMarkdownFiles(dir, fileList = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      // Evitamos carpetas internas, node_modules y carpetas de build
      if (!file.name.startsWith('.') && file.name !== 'node_modules' && file.name !== 'apps' && file.name !== 'supabase') {
        await getMarkdownFiles(path.join(dir, file.name), fileList);
      }
    } else if (file.name.endsWith('.md')) {
      fileList.push(path.join(dir, file.name));
    }
  }
  return fileList;
}

async function main() {
  console.log("✅ Conectado a Supabase exitosamente.");
  console.log(`Buscando archivos en tu bóveda: ${vaultPath}`);
  
  try {
    const mdFiles = await getMarkdownFiles(vaultPath);
    console.log(`\n📄 Se encontraron ${mdFiles.length} notas útiles en tu bóveda.`);
    
    let subidos = 0;
    for (const file of mdFiles) {
      const content = await fs.readFile(file, 'utf8');
      const stats = await fs.stat(file);
      const relativePath = path.relative(vaultPath, file);
      const title = path.basename(file, '.md');
      
      const { error } = await supabase
        .from('obsidian_knowledge')
        .upsert({
          title: title,
          file_path: relativePath,
          content: content,
          last_modified: stats.mtime.toISOString()
        }, { onConflict: 'file_path' });
        
      if (error) {
        console.error(`❌ Error subiendo [${title}]:`, error.message);
      } else {
        subidos++;
      }
    }
    
    console.log(`\n🚀 ¡Listo! Se subieron ${subidos}/${mdFiles.length} archivos a Supabase exitosamente.`);
  } catch (error) {
    console.error("❌ Error durante el proceso.");
    console.error(error);
  }
}

main();
