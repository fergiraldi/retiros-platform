import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import { poolProvider } from './pool.provider';
import { POOL } from './db.tokens';

@Global()
@Module({
  providers: [poolProvider],
  exports: [POOL],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
