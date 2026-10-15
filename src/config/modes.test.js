import { describe, it, expect } from 'vitest';
import { resolveMode, canChangeMode, isRouteAllowed, isValidMode } from './modes';

const client = (mode = 'guided') => ({ mode, isAdmin: false });
const admin = (mode = 'advanced') => ({ mode, isAdmin: true });

describe('resolveMode', () => {
  it('app senza cloud: vale la scelta locale, default Avanzata', () => {
    expect(resolveMode({ cloudEnabled: false, profile: null, localMode: 'guided' })).toBe('guided');
    expect(resolveMode({ cloudEnabled: false, profile: null, localMode: null })).toBe('advanced');
    expect(resolveMode({ cloudEnabled: false, profile: null, localMode: 'boh' })).toBe('advanced');
  });
  it('cliente: vince sempre il profilo assegnato, anche se la scelta locale è manomessa', () => {
    expect(resolveMode({ cloudEnabled: true, profile: client('guided'), localMode: 'pro' })).toBe('guided');
    expect(resolveMode({ cloudEnabled: true, profile: client('guided'), localMode: 'advanced' })).toBe('guided');
    expect(resolveMode({ cloudEnabled: true, profile: client('advanced'), localMode: 'guided' })).toBe('advanced');
  });
  it('cliente con modalità del profilo non valida → Guidata (mai più permissiva)', () => {
    expect(resolveMode({ cloudEnabled: true, profile: client('hacker'), localMode: 'pro' })).toBe('guided');
  });
  it('amministratore: può provare le altre modalità per sé; senza scelta usa quella del profilo', () => {
    expect(resolveMode({ cloudEnabled: true, profile: admin('advanced'), localMode: 'guided' })).toBe('guided');
    expect(resolveMode({ cloudEnabled: true, profile: admin('pro'), localMode: null })).toBe('pro');
    expect(resolveMode({ cloudEnabled: true, profile: admin('x'), localMode: null })).toBe('advanced');
  });
  it('con account ma profilo non disponibile (SQL non eseguito): comportamento storico', () => {
    expect(resolveMode({ cloudEnabled: true, profile: null, localMode: 'guided' })).toBe('advanced');
  });
});

describe('canChangeMode', () => {
  it('solo proprietario (locale) e amministratore', () => {
    expect(canChangeMode({ cloudEnabled: false, profile: null })).toBe(true);
    expect(canChangeMode({ cloudEnabled: true, profile: admin() })).toBe(true);
    expect(canChangeMode({ cloudEnabled: true, profile: client() })).toBe(false);
    expect(canChangeMode({ cloudEnabled: true, profile: null })).toBe(false);
  });
});

describe('modalità e rotte', () => {
  it('Guidata consente solo le pagine previste', () => {
    for (const p of ['/', '/portfolio', '/transactions', '/transactions/new', '/settings']) expect(isRouteAllowed('guided', p)).toBe(true);
    for (const p of ['/performance', '/analysis', '/rebalancing', '/dividendi', '/portfolios', '/patrimonio']) expect(isRouteAllowed('guided', p)).toBe(false);
  });
  it('Avanzata e Pro consentono tutto', () => {
    expect(isRouteAllowed('advanced', '/performance')).toBe(true);
    expect(isRouteAllowed('pro', '/analysis')).toBe(true);
  });
  it('isValidMode non accetta chiavi ereditate dal prototipo', () => {
    expect(isValidMode('guided')).toBe(true);
    expect(isValidMode('toString')).toBe(false);
    expect(isValidMode('__proto__')).toBe(false);
  });
});
