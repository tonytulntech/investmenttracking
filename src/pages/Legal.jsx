import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { LEGAL } from '../config/legal';

function LegalLayout({ title, children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1rem' }}>
      <article style={{ maxWidth: 760, margin: '0 auto', color: 'var(--text-2)', lineHeight: 1.65, fontSize: '0.92rem' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-1)', textDecoration: 'none', fontWeight: 700, marginBottom: '1.5rem' }}>
          <TrendingUp size={18} /> {LEGAL.appName}
        </Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.25rem' }}>{title}</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '2rem' }}>Ultimo aggiornamento: {LEGAL.lastUpdated}</p>
        <div className="legal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>{children}</div>
        <nav style={{ marginTop: '2.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.25rem', fontSize: '0.82rem' }}>
          <Link to="/privacy" style={{ color: 'var(--text-3)' }}>Informativa privacy</Link>
          <Link to="/termini" style={{ color: 'var(--text-3)' }}>Termini di servizio</Link>
        </nav>
      </article>
    </div>
  );
}

const H = ({ children }) => (
  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.4rem' }}>{children}</h2>
);
const Ul = ({ children }) => <ul style={{ paddingLeft: '1.25rem', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>{children}</ul>;

export function PrivacyPage() {
  return (
    <LegalLayout title="Informativa sulla privacy">
      <section>
        <p>
          Questa informativa descrive come {LEGAL.appName} (il «Servizio», raggiungibile su {LEGAL.siteUrl}) tratta i dati
          personali degli utenti, ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR).
        </p>
      </section>

      <section>
        <H>1. Titolare del trattamento</H>
        <p>{LEGAL.controllerName}. Contatto per qualsiasi richiesta sulla privacy: <a href={`mailto:${LEGAL.contactEmail}`} style={{ color: 'var(--accent)' }}>{LEGAL.contactEmail}</a>.</p>
      </section>

      <section>
        <H>2. Quali dati trattiamo</H>
        <Ul>
          <li><strong>Dati dell&apos;account:</strong> indirizzo email e, se accedi con Google, nome e email dell&apos;account Google.</li>
          <li><strong>Dati che inserisci tu:</strong> transazioni, portafogli, obiettivi, regole, impostazioni e altre informazioni finanziarie che decidi di registrare nel Servizio. Non accediamo ai tuoi conti presso banche o broker.</li>
          <li><strong>Dati tecnici:</strong> indirizzo IP, data e ora di accesso e informazioni sul dispositivo, generati dall&apos;infrastruttura per sicurezza e funzionamento.</li>
        </Ul>
      </section>

      <section>
        <H>3. Finalità e basi giuridiche</H>
        <Ul>
          <li>Creare e gestire il tuo account e fornirti il Servizio — esecuzione del contratto o di misure precontrattuali (art. 6.1.b).</li>
          <li>Sicurezza, prevenzione degli abusi e continuità del Servizio — legittimo interesse (art. 6.1.f).</li>
          <li>Adempiere a obblighi di legge — art. 6.1.c.</li>
        </Ul>
        <p>Non usiamo i tuoi dati per pubblicità né li vendiamo a terzi. Non effettuiamo profilazione automatizzata che produca effetti giuridici su di te.</p>
      </section>

      <section>
        <H>4. Con chi condividiamo i dati</H>
        <p>Ci avvaliamo di fornitori che trattano i dati per nostro conto (responsabili del trattamento):</p>
        <Ul>
          <li><strong>Supabase</strong> — autenticazione e archiviazione dei dati dell&apos;account e dei dati inseriti. Area geografica dei dati: {LEGAL.dataRegion}.</li>
          <li><strong>Vercel</strong> — hosting del sito.</li>
          <li><strong>Google</strong> — solo se scegli «Continua con Google», per autenticarti.</li>
          <li><strong>Servizio di invio email</strong> — per inviarti il link o il codice di accesso, se scegli l&apos;accesso via email.</li>
        </Ul>
        <p>
          Alcuni fornitori hanno sede negli Stati Uniti. I trasferimenti avvengono sulla base di garanzie adeguate previste dal GDPR
          (decisione di adeguatezza / clausole contrattuali standard).
        </p>
      </section>

      <section>
        <H>5. Accesso del titolare ai dati</H>
        <p>
          I dati di ciascun utente sono isolati tramite regole di sicurezza del database: gli altri utenti non possono vederli e il
          Servizio non offre al titolare alcuna vista dei dati dei singoli utenti. Tuttavia, in qualità di amministratore
          dell&apos;infrastruttura, il titolare può tecnicamente accedere al database per manutenzione, sicurezza o su tua richiesta, e si impegna a non farlo
          per altre finalità.
        </p>
      </section>

      <section>
        <H>6. Archiviazione locale e cookie</H>
        <p>
          Il Servizio utilizza l&apos;archiviazione locale del browser (local storage) e, per l&apos;accesso, dati di sessione tecnici, necessari al
          funzionamento: mantenerti connesso, ricordare tema e preferenze, tenere una copia di lavoro dei tuoi dati. Non utilizziamo cookie di
          profilazione né strumenti di analisi di terze parti.
        </p>
      </section>

      <section>
        <H>7. Conservazione</H>
        <p>
          Conserviamo i tuoi dati finché il tuo account è attivo. Alla cancellazione dell&apos;account i dati vengono eliminati, salvo copie di
          backup tecniche che vengono sovrascritte nei normali cicli, e quanto sia necessario conservare per obblighi di legge.
        </p>
      </section>

      <section>
        <H>8. I tuoi diritti</H>
        <p>
          Puoi chiedere in ogni momento accesso, rettifica, cancellazione, limitazione, portabilità dei tuoi dati e opporti al trattamento
          scrivendo a <a href={`mailto:${LEGAL.contactEmail}`} style={{ color: 'var(--accent)' }}>{LEGAL.contactEmail}</a>. Puoi inoltre esportare i tuoi dati
          dalla sezione Impostazioni (backup JSON). Hai diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).
        </p>
      </section>

      <section>
        <H>9. Modifiche</H>
        <p>Potremo aggiornare questa informativa; la data di ultimo aggiornamento è indicata in alto. In caso di modifiche rilevanti ti informeremo nel Servizio.</p>
      </section>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Termini di servizio">
      <section>
        <p>
          Utilizzando {LEGAL.appName} (il «Servizio») accetti questi termini. Se non li accetti, non utilizzare il Servizio.
        </p>
      </section>

      <section>
        <H>1. Natura del Servizio</H>
        <p>
          {LEGAL.appName} è uno strumento <strong>educativo e di monitoraggio personale</strong>: ti permette di registrare i tuoi investimenti,
          vedere come evolvono e confrontarli con regole e obiettivi che scegli tu. Le decisioni di investimento sono sempre e solo tue.
        </p>
      </section>

      <section>
        <H>2. Nessuna consulenza finanziaria</H>
        <Ul>
          <li>Il Servizio <strong>non costituisce consulenza in materia di investimenti</strong>, né raccomandazione personalizzata, né sollecitazione all&apos;acquisto o alla vendita di strumenti finanziari.</li>
          <li>Le simulazioni e le probabilità mostrate sono <strong>stime basate su ipotesi dichiarate</strong>, non previsioni né garanzie di risultato.</li>
          <li>I rendimenti passati non sono indicativi di quelli futuri. Ogni investimento comporta rischi, compresa la perdita del capitale.</li>
          <li>Prima di prendere decisioni di investimento valuta la tua situazione personale e, se necessario, rivolgiti a un consulente abilitato.</li>
        </Ul>
      </section>

      <section>
        <H>3. Account e accesso</H>
        <p>
          L&apos;accesso è riservato agli utenti autorizzati. L&apos;account è personale e non cedibile. Sei responsabile della sicurezza del tuo
          account email o Google e delle attività svolte tramite esso.
        </p>
      </section>

      <section>
        <H>4. I tuoi dati e le fonti esterne</H>
        <p>
          Sei responsabile dell&apos;esattezza dei dati che inserisci. I prezzi di mercato provengono da fonti di terze parti (ad esempio
          Yahoo Finance, CoinGecko) e possono essere ritardati, incompleti o errati: non garantiamo la loro correttezza.
        </p>
      </section>

      <section>
        <H>5. Disponibilità e backup</H>
        <p>
          Il Servizio è fornito «così com&apos;è», senza garanzia di disponibilità continua o assenza di errori. Ti consigliamo di esportare periodicamente
          un backup dei tuoi dati dalla sezione Impostazioni.
        </p>
      </section>

      <section>
        <H>6. Limitazione di responsabilità</H>
        <p>
          Nei limiti consentiti dalla legge, il titolare non risponde di perdite o danni derivanti dall&apos;uso del Servizio o dalle decisioni
          prese sulla base delle informazioni mostrate. Restano salvi i diritti inderogabili dei consumatori e le responsabilità che la legge
          non consente di escludere (ad esempio per dolo o colpa grave).
        </p>
      </section>

      <section>
        <H>7. Cessazione</H>
        <p>
          Puoi smettere di usare il Servizio e chiedere la cancellazione dell&apos;account in qualsiasi momento scrivendo a{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} style={{ color: 'var(--accent)' }}>{LEGAL.contactEmail}</a>. Possiamo sospendere o chiudere
          gli account in caso di uso scorretto o di cessazione del Servizio, dandoti ove possibile un preavviso per esportare i dati.
        </p>
      </section>

      <section>
        <H>8. Modifiche, legge applicabile</H>
        <p>
          Potremo aggiornare questi termini; l&apos;uso del Servizio dopo la modifica ne implica l&apos;accettazione. I termini sono regolati dalla
          legge italiana. Per i consumatori resta fermo il foro del luogo di residenza o domicilio.
        </p>
        <p>Per qualsiasi domanda: <a href={`mailto:${LEGAL.contactEmail}`} style={{ color: 'var(--accent)' }}>{LEGAL.contactEmail}</a>.</p>
      </section>
    </LegalLayout>
  );
}
