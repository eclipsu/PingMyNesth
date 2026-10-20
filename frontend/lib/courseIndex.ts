/**
 * Course autocomplete backed by a prefix trie.
 *
 * Every word of a course ("calculus", "i", "with", ...), its code ("mat",
 * "167", "mat167") and its subject's name ("mathematics") is inserted into
 * the trie. Each trie node keeps the ids of every entry that has a word
 * passing through it, so looking up a prefix is O(prefix length) and needs
 * no subtree walk. A multi-word query intersects the id sets of its words.
 *
 * Kept free of app imports so it can be unit tested with plain Node.
 */

export type CatalogSubject = { subject: string; name: string };
export type CatalogCourse = {
  subject: string;
  catalog_nbr: string;
  title: string;
  /** AND-of-OR groups; see lib/prereqGraph.ts */
  prereqs?: string[][];
  coreqs?: string[][];
  requirement?: string;
};
export type CatalogInstructor = { first: string; last: string; subjects: string[] };
export type Catalog = {
  subjects: CatalogSubject[];
  courses: CatalogCourse[];
  instructors?: CatalogInstructor[];
};

export type Suggestion =
  | { kind: "course"; subject: string; catalogNbr: string; title: string; query: string }
  | { kind: "subject"; subject: string; name: string; query: string };

type Node = {
  children: Map<string, Node>;
  /** entries with a word that starts with this node's prefix */
  ids: number[];
  /** entries with a word that ends exactly here */
  ends: Set<number>;
};

const newNode = (): Node => ({ children: new Map(), ids: [], ends: new Set() });

class Trie {
  private root = newNode();

  insert(word: string, id: number) {
    let node = this.root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (!next) {
        next = newNode();
        node.children.set(ch, next);
      }
      node = next;
      // all words of one entry are inserted back to back, so checking the
      // last id is enough to keep each list duplicate-free
      if (node.ids[node.ids.length - 1] !== id) node.ids.push(id);
    }
    node.ends.add(id);
  }

  find(prefix: string): Node | undefined {
    let node: Node | undefined = this.root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (!node) return undefined;
    }
    return node;
  }
}

/** Lowercase words, splitting "mat167" into "mat" + "167". */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** "calc 1" should find "Calculus I", so 1-4 also match roman numerals exactly. */
const ROMAN: Record<string, string> = { "1": "i", "2": "ii", "3": "iii", "4": "iv" };

export class CourseIndex {
  private trie = new Trie();
  private entries: Suggestion[] = [];
  private words: Set<string>[] = [];

  constructor(catalog: Catalog) {
    const subjectNames = new Map(catalog.subjects.map((s) => [s.subject.toUpperCase(), s.name]));

    for (const s of catalog.subjects) {
      const code = s.subject.toUpperCase();
      this.add({ kind: "subject", subject: code, name: s.name, query: code }, [code, s.name]);
    }
    for (const c of catalog.courses) {
      const code = c.subject.toUpperCase();
      const nbr = c.catalog_nbr.toUpperCase();
      this.add(
        { kind: "course", subject: code, catalogNbr: nbr, title: c.title, query: `${code} ${nbr}` },
        [code, nbr, `${code}${nbr}`, c.title, subjectNames.get(code) ?? ""],
      );
    }
  }

  get size() {
    return this.entries.length;
  }

  private add(entry: Suggestion, texts: string[]) {
    const id = this.entries.length;
    this.entries.push(entry);
    const words = new Set(texts.flatMap((t) => [...tokenize(t), t.toLowerCase().replace(/\s+/g, "")]));
    words.delete("");
    this.words.push(words);
    for (const w of words) this.trie.insert(w, id);
  }

  search(query: string, limit = 8): Suggestion[] {
    const tokens = tokenize(query);
    if (!tokens.length) return [];

    // score[id] accumulates per token: exact word = 3, prefix only = 1
    let scores: Map<number, number> | null = null;
    for (const token of tokens) {
      const next = new Map<number, number>();
      const prefix = this.trie.find(token);
      const roman = ROMAN[token] ? this.trie.find(ROMAN[token]) : undefined;
      for (const id of prefix?.ids ?? []) next.set(id, prefix!.ends.has(id) ? 3 : 1);
      for (const id of roman?.ends ?? []) next.set(id, 3);

      if (scores === null) {
        scores = next;
      } else {
        const merged = new Map<number, number>();
        for (const [id, s] of scores) {
          const add = next.get(id);
          if (add !== undefined) merged.set(id, s + add);
        }
        scores = merged;
      }
      if (!scores.size) return [];
    }

    const first = tokens[0];
    const ranked = [...scores!].map(([id, score]) => {
      const e = this.entries[id];
      let bonus = 0;
      if (e.kind === "subject" && e.subject.toLowerCase() === first) bonus += 5;
      // typing a subject's name ("accounting") should offer the subject before its courses
      if (e.kind === "subject" && tokenize(e.name)[0]?.startsWith(first)) bonus += 3;
      if (e.kind === "course" && tokenize(e.title)[0]?.startsWith(first)) bonus += 2;
      return { e, score: score + bonus };
    });

    ranked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.e.kind !== b.e.kind) return a.e.kind === "subject" ? -1 : 1;
      if (a.e.kind === "course" && b.e.kind === "course") {
        if (a.e.subject !== b.e.subject) return a.e.subject < b.e.subject ? -1 : 1;
        return parseInt(a.e.catalogNbr, 10) - parseInt(b.e.catalogNbr, 10) || (a.e.catalogNbr < b.e.catalogNbr ? -1 : 1);
      }
      return a.e.subject < b.e.subject ? -1 : 1;
    });

    return ranked.slice(0, limit).map((r) => r.e);
  }
}

export type ProfessorSuggestion = CatalogInstructor & { name: string };

/**
 * Instructor autocomplete over the same trie: every part of a name
 * ("ching", "shyang", "chen") and the whole name glued ("chingshyangchen")
 * is a key, so first names, last names, and partials all match.
 */
export class ProfessorIndex {
  private trie = new Trie();
  private people: ProfessorSuggestion[] = [];

  constructor(instructors: CatalogInstructor[]) {
    for (const p of instructors) {
      const id = this.people.length;
      const name = `${p.first} ${p.last}`.trim();
      this.people.push({ ...p, name });
      const words = new Set([...tokenize(name), tokenize(name).join("")]);
      for (const w of words) if (w) this.trie.insert(w, id);
    }
  }

  get size() {
    return this.people.length;
  }

  search(query: string, limit = 8): ProfessorSuggestion[] {
    const tokens = tokenize(query);
    if (!tokens.length) return [];

    let scores: Map<number, number> | null = null;
    for (const token of tokens) {
      const node = this.trie.find(token);
      const next = new Map<number, number>();
      for (const id of node?.ids ?? []) next.set(id, node!.ends.has(id) ? 3 : 1);
      if (scores === null) {
        scores = next;
      } else {
        const merged = new Map<number, number>();
        for (const [id, sc] of scores) {
          const add = next.get(id);
          if (add !== undefined) merged.set(id, sc + add);
        }
        scores = merged;
      }
      if (!scores.size) return [];
    }

    const last = (id: number) => this.people[id].last.toLowerCase();
    return [...scores!]
      .map(([id, score]) => ({ id, score: score + (last(id).startsWith(tokens[0]) ? 1 : 0) }))
      .sort((a, b) => b.score - a.score || this.people[a.id].name.localeCompare(this.people[b.id].name))
      .slice(0, limit)
      .map(({ id }) => this.people[id]);
  }
}
