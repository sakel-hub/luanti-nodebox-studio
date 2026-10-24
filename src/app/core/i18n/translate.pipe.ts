import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';
import { TranslationKey } from './translation.types';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private readonly translationService = inject(TranslationService);

  transform(key: TranslationKey | string, params?: Record<string, string | number>): string {
    if (!key) return '';
    return this.translationService.t(key as TranslationKey, params);
  }
}
