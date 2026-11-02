import { Global, Module } from '@nestjs/common';
import { LimiteDeTaxaService } from './limite-de-taxa.service';

/** Global para todos contarem no MESMO limitador: a ficha (RN-210) e a
 *  cobrança pública (RNF-012) — uma instância por módulo contaria sozinha. */
@Global()
@Module({ providers: [LimiteDeTaxaService], exports: [LimiteDeTaxaService] })
export class LimiteDeTaxaModule {}
