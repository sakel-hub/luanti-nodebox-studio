import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { ShareDialogComponent } from './share-dialog.component';

describe('ShareDialogComponent', () => {
  it('should instantiate and generate social share URLs', () => {
    const comp = new ShareDialogComponent();
    expect(comp.twitterShareUrl).toContain('twitter.com/intent/tweet');
    expect(comp.redditShareUrl).toContain('reddit.com/submit');
    expect(comp.whatsAppShareUrl).toContain('api.whatsapp.com');
    expect(comp.facebookShareUrl).toContain('facebook.com/sharer');
  });

  it('should emit close on escape', () => {
    const comp = new ShareDialogComponent();
    let closed = false;
    comp.close.subscribe(() => { closed = true; });

    comp.onEscape();
    expect(closed).toBe(true);
  });
});
